"use client";
// Materials for the paper book. Cotton yarn, cloth and paper: fully matte (roughness >= 0.9,
// metalness 0, low specular). Yarn gets a weak sheen, which is what reads as fibre under soft light.
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BORDER_R, D, PANEL_SIZE, W } from "./geometry";
import { canvasTexture, chainBorder, imageNormal, knit, paperNormal, weaveNormal } from "./knitMaps";
import { canvas, drawBlankPage, drawLabel, drawLeftPage, drawPageEdges, drawRightPage, LABEL_CM, PAGE_D } from "./paperTextures";

export const COVER_SRC = "/pic/bird.png";

export interface BookMaterials {
  cream: THREE.MeshPhysicalMaterial; lavender: THREE.MeshPhysicalMaterial; border: THREE.MeshPhysicalMaterial;
  panel: THREE.MeshPhysicalMaterial; label: THREE.MeshPhysicalMaterial; thread: THREE.MeshPhysicalMaterial;
  inside: THREE.MeshStandardMaterial; block: THREE.Material[];
  pageFront: THREE.MeshStandardMaterial; pageBack: THREE.MeshStandardMaterial;
  rightPage: THREE.MeshStandardMaterial; leftPage: THREE.MeshStandardMaterial;
}

/** object-fit: cover for a texture on a plane of the given aspect. */
export function coverFit(tex: THREE.Texture, planeAspect: number) {
  const img = tex.image as { width: number; height: number }, ia = img.width / img.height;
  tex.repeat.set(1, 1); tex.offset.set(0, 0);
  if (ia > planeAspect) { tex.repeat.x = planeAspect / ia; tex.offset.x = (1 - tex.repeat.x) / 2; }
  else { tex.repeat.y = ia / planeAspect; tex.offset.y = (1 - tex.repeat.y) / 2; }
}

type Tile = { maps: { color: HTMLCanvasElement; normal: HTMLCanvasElement; orm: HTMLCanvasElement }; tileCm: [number, number] };
const yarn = (gl: THREE.WebGLRenderer, k: Tile, sheen: string, normalScale = 1.4) => {
  const rep: [number, number] = [1 / k.tileCm[0], 1 / k.tileCm[1]], orm = canvasTexture(k.maps.orm, false, gl, rep);
  return new THREE.MeshPhysicalMaterial({
    map: canvasTexture(k.maps.color, true, gl, rep),
    normalMap: canvasTexture(k.maps.normal, false, gl, rep), normalScale: new THREE.Vector2(normalScale, normalScale),
    aoMap: orm, roughnessMap: orm, roughness: 1, metalness: 0,
    sheen: 0.3, sheenColor: new THREE.Color(sheen), sheenRoughness: 0.85, specularIntensity: 0.12,
  });
};

let printed: { right: HTMLCanvasElement; left: HTMLCanvasElement; blank: HTMLCanvasElement; edges: HTMLCanvasElement; label: HTMLCanvasElement } | null = null;

export function useBookMaterials(): BookMaterials {
  const gl = useThree(s => s.gl), invalidate = useThree(s => s.invalidate);
  const m = useMemo(() => {
    const pw = 1024, ph = Math.round(1024 * PAGE_D / (W - 0.35));
    printed ??= (() => {
      const right = canvas(pw, ph), left = canvas(pw, ph), blank = canvas(512, Math.round(512 * PAGE_D / W)), edges = canvas(8, 1024), label = canvas(1024, Math.round(1024 * LABEL_CM[1] / LABEL_CM[0]));
      drawRightPage(right); drawLeftPage(left); drawBlankPage(blank); drawPageEdges(edges); drawLabel(label);
      return { right, left, blank, edges, label };
    })();
    const P = printed;

    // design comp: a cream linen cover with a flat lavender binding (spine and edge tape)
    const linen = (color: string, sheen: string) => new THREE.MeshPhysicalMaterial({
      color, roughness: 0.94, metalness: 0, specularIntensity: 0.1, sheen: 0.25, sheenColor: new THREE.Color(sheen), sheenRoughness: 0.85,
      normalMap: canvasTexture(weaveNormal(), false, gl, [1 / 0.8, 1 / 0.8]), normalScale: new THREE.Vector2(0.45, 0.45), // uv in cm: ~20 threads/cm
    });
    const cream = linen("#F3EAD9", "#FFF8EE");
    const lavender = linen("#B8A6E0", "#E2D8F6");
    const border = linen("#AF9CDB", "#E2D8F6");

    // front picture: colour from bird.png, relief from its brightness so the stitches stand out
    const panel = new THREE.MeshPhysicalMaterial({ roughness: 0.93, metalness: 0, specularIntensity: 0.1, sheen: 0.25, sheenColor: new THREE.Color("#FFF6EE"), sheenRoughness: 0.85, normalScale: new THREE.Vector2(0.9, 0.9) });
    new THREE.ImageLoader().load(COVER_SRC, img => {
      const map = new THREE.Texture(img); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = gl.capabilities.getMaxAnisotropy(); map.needsUpdate = true;
      const nrm = new THREE.CanvasTexture(imageNormal(img)); nrm.colorSpace = THREE.NoColorSpace; nrm.anisotropy = map.anisotropy;
      coverFit(map, PANEL_SIZE[0] / PANEL_SIZE[1]); nrm.repeat.copy(map.repeat); nrm.offset.copy(map.offset);
      panel.map = map; panel.normalMap = nrm; panel.needsUpdate = true; invalidate();
    });

    const labelTex = canvasTexture(P.label, true, gl); labelTex.wrapS = labelTex.wrapT = THREE.ClampToEdgeWrapping;
    const label = new THREE.MeshPhysicalMaterial({ map: labelTex, roughness: 0.92, metalness: 0, specularIntensity: 0.08, sheen: 0.2, sheenColor: new THREE.Color("#ffffff"),
      normalMap: canvasTexture(weaveNormal(), false, gl, [LABEL_CM[0] / 0.08, LABEL_CM[1] / 0.08]), normalScale: new THREE.Vector2(0.35, 0.35) });
    const thread = new THREE.MeshPhysicalMaterial({ color: "#A991D6", roughness: 0.9, metalness: 0, specularIntensity: 0.1, sheen: 0.4, sheenColor: new THREE.Color("#E6DCF7") });

    // paper: warm cream, fibre normal, completely matte
    const fibre = (rep: [number, number]) => canvasTexture(paperNormal(), false, gl, rep);
    const paper = (map: HTMLCanvasElement, side: THREE.Side, flipU = false) => {
      const t = canvasTexture(map, true, gl); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      if (flipU) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; } // back face: un-mirror
      return new THREE.MeshStandardMaterial({ map: t, side, roughness: 0.97, metalness: 0, normalMap: fibre([W / 3, D / 3]), normalScale: new THREE.Vector2(0.25, 0.25) });
    };
    const pageFront = paper(P.blank, THREE.FrontSide), pageBack = paper(P.blank, THREE.BackSide, true);
    // printed pages: right = the page under the turning sheets; left = back of the last turned sheet
    const rightPage = paper(P.right, THREE.FrontSide), leftPage = paper(P.left, THREE.BackSide, true);
    // web fonts may arrive after the first draw: reprint once they are ready
    document.fonts?.ready.then(() => {
      drawLabel(P.label); drawRightPage(P.right); drawLeftPage(P.left);
      labelTex.needsUpdate = true; rightPage.map!.needsUpdate = true; leftPage.map!.needsUpdate = true; invalidate();
    });

    // page block faces: [+x fore edge, -x spine side, +y top, -y, +z tail, -z head]
    const edge = () => new THREE.MeshStandardMaterial({ map: canvasTexture(P.edges, true, gl, [1, 1]), roughness: 0.97, metalness: 0 });
    const plain = new THREE.MeshStandardMaterial({ color: "#F2E8D6", roughness: 0.97 });
    const inside = new THREE.MeshStandardMaterial({ color: "#F4EADB", roughness: 0.95, metalness: 0, normalMap: fibre([W / 3, D / 3]), normalScale: new THREE.Vector2(0.2, 0.2) });
    return { cream, lavender, border, panel, label, thread, inside, pageFront, pageBack, rightPage, leftPage, block: [edge(), plain, plain, plain, edge(), edge()] };
  }, [gl, invalidate]);
  useEffect(() => () => { Object.values(m).flat().forEach(x => { if (x instanceof THREE.Material) x.dispose(); }); }, [m]);
  return m;
}
