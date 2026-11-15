"use client";
// Materials for the WebGL book. Goal: cotton yarn and paper, not plastic.
// Everything is fully matte (metalness 0, roughness 0.85-0.95, low specular); the yarn gets a weak
// lavender sheen, which is what makes fibres read as cloth under grazing light.
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { D, W } from "./geometry";
import { canvasTexture, knitMaps, weaveMaps } from "./knitMaps";
import { canvas, drawEndpaper, drawLabel, drawPageEdges, drawTopPage, LABEL_CM } from "./paperTextures";

export interface BookMaterials {
  knit: THREE.MeshPhysicalMaterial; edge: THREE.MeshPhysicalMaterial; join: THREE.MeshPhysicalMaterial;
  thread: THREE.MeshPhysicalMaterial; board: THREE.Material; panel: THREE.MeshPhysicalMaterial;
  label: THREE.MeshPhysicalMaterial; endpaper: THREE.MeshStandardMaterial; pages: THREE.Material[];
  endpaperCanvas: HTMLCanvasElement; endpaperTex: THREE.CanvasTexture;
}

export const COVER_SRC = "/pic/bird.png";
export const PANEL_INSET = 0.07 * W;
export const PANEL: [number, number] = [W - 2 * PANEL_INSET, D - 2 * PANEL_INSET];
const LAVENDER = new THREE.Color("#D3C5EF");

/** object-fit: cover for a texture on a plane of the given aspect. */
export function coverFit(tex: THREE.Texture, planeAspect: number) {
  const img = tex.image as { width: number; height: number }, ia = img.width / img.height;
  tex.repeat.set(1, 1); tex.offset.set(0, 0);
  if (ia > planeAspect) { tex.repeat.x = planeAspect / ia; tex.offset.x = (1 - tex.repeat.x) / 2; }
  else { tex.repeat.y = ia / planeAspect; tex.offset.y = (1 - tex.repeat.y) / 2; }
}

function yarnMaterial(gl: THREE.WebGLRenderer, tint = "#ffffff") {
  const k = knitMaps(), rep: [number, number] = [1 / k.tileCm[0], 1 / k.tileCm[1]]; // uv is in cm
  const orm = canvasTexture(k.orm, false, gl, rep);
  return new THREE.MeshPhysicalMaterial({
    color: tint,
    map: canvasTexture(k.color, true, gl, rep),
    normalMap: canvasTexture(k.normal, false, gl, rep), normalScale: new THREE.Vector2(1.6, 1.6),
    aoMap: orm, aoMapIntensity: 1, roughnessMap: orm, roughness: 1, metalness: 0,
    sheen: 0.3, sheenColor: LAVENDER, sheenRoughness: 0.8, specularIntensity: 0.18,
  });
}

let paperCache: { edges: HTMLCanvasElement; top: HTMLCanvasElement; label: HTMLCanvasElement } | null = null;

export function useBookMaterials(): BookMaterials {
  const gl = useThree(s => s.gl), invalidate = useThree(s => s.invalidate);
  const m = useMemo(() => {
    paperCache ??= (() => {
      const label = canvas(1024, Math.round(1024 * LABEL_CM[1] / LABEL_CM[0]));
      drawLabel(label);
      const edges = canvas(64, 256), top = canvas(1024, 1024); drawPageEdges(edges); drawTopPage(top); // edge lines: ~170 across the block (finer only moires)
      return { edges, top, label };
    })();
    const knit = yarnMaterial(gl);
    const edge = knit; // the edging round uses the same yarn; its uv is also in cm
    const join = yarnMaterial(gl, "#CFC3E6"); // slip-stitch join in the darker gap colour

    const weave = weaveMaps();
    const panel = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.92, metalness: 0, specularIntensity: 0.15, sheen: 0.2, sheenColor: new THREE.Color("#ffffff"), sheenRoughness: 0.9,
      normalMap: canvasTexture(weave.normal, false, gl, [PANEL[0] / 0.16, PANEL[1] / 0.16]), normalScale: new THREE.Vector2(0.22, 0.22) });
    new THREE.TextureLoader().load(COVER_SRC, t => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = gl.capabilities.getMaxAnisotropy();
      coverFit(t, PANEL[0] / PANEL[1]); panel.map = t; panel.needsUpdate = true; invalidate();
    });

    const thread = new THREE.MeshPhysicalMaterial({ color: "#F3CB76", roughness: 0.82, metalness: 0, specularIntensity: 0.2, sheen: 0.4, sheenColor: new THREE.Color("#FFF1CC"), sheenRoughness: 0.7 });
    const labelTex = canvasTexture(paperCache.label, true, gl); labelTex.wrapS = labelTex.wrapT = THREE.ClampToEdgeWrapping;
    // the label uses web fonts: redraw once they are loaded
    document.fonts?.ready.then(() => { drawLabel(paperCache!.label); labelTex.needsUpdate = true; invalidate(); });
    const label = new THREE.MeshPhysicalMaterial({ map: labelTex, roughness: 0.9, metalness: 0, specularIntensity: 0.12, sheen: 0.25, sheenColor: new THREE.Color("#ffffff"),
      normalMap: canvasTexture(weave.normal, false, gl, [LABEL_CM[0] / 0.08, LABEL_CM[1] / 0.08]), normalScale: new THREE.Vector2(0.35, 0.35) });

    const endpaperCanvas = canvas(1024, Math.round(1024 * D / 11.7));
    const endpaperTex = canvasTexture(endpaperCanvas, true, gl); endpaperTex.wrapS = endpaperTex.wrapT = THREE.ClampToEdgeWrapping;
    endpaperTex.center.set(0.5, 0.5); endpaperTex.rotation = Math.PI; // the plane faces down in the closed frame; upright once the cover is open
    const endpaper = new THREE.MeshStandardMaterial({ map: endpaperTex, roughness: 0.95, metalness: 0 });
    drawEndpaper(endpaperCanvas, 0, true); endpaperTex.needsUpdate = true;

    const edgeTex = canvasTexture(paperCache.edges, true, gl, [1, 2]);
    const pageEdge = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.95, metalness: 0 });
    const topTex = canvasTexture(paperCache.top, true, gl); topTex.wrapS = topTex.wrapT = THREE.ClampToEdgeWrapping;
    const top = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.95, metalness: 0 });
    const plain = new THREE.MeshStandardMaterial({ color: "#F3EEE6", roughness: 0.95 });
    return {
      knit, edge, join, thread, panel, label, endpaper, endpaperCanvas, endpaperTex,
      board: new THREE.MeshStandardMaterial({ color: "#E7DFD3", roughness: 0.92 }),
      pages: [pageEdge, plain, top, plain, pageEdge, pageEdge],
    };
  }, [gl, invalidate]);
  useEffect(() => () => {
    Object.values(m).flat().forEach(x => { if (x instanceof THREE.Material) x.dispose(); });
  }, [m]);
  return m;
}
