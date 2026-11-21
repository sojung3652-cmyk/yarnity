"use client";
// Materials for the cloth hardcover: lavender book cloth (spine, back, the band turned onto the front),
// the printed front cover, a paper label, cream endpapers and paper. All matte: book cloth roughness
// 0.85 with a very fine woven normal map, paper fully matte, metalness 0 everywhere.
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { COVER_H, COVER_W, drawCover, drawLabel, LABEL, lavender, loadCoverAssets } from "../coverArt";
import { BAND_L, D, SPINE_TURN, W } from "./geometry";
import { canvas, drawBlankPage, drawLeftPage, drawPageEdges, drawRightPage, PAGE_D } from "./paperTextures";
import { canvasTexture, clothNormal, clothWeave, mottleMap, paperNormal, spineMap } from "./textures";

export interface BookMaterials {
  cloth: THREE.MeshStandardMaterial;
  /** the spine band: the cloth itself on phones; on the web one tone darker with headbands and hinge grooves */
  spine: THREE.MeshStandardMaterial;
  /** web only: how far the boards reach past the page block, beyond SQUARE, [fore edge, head/tail] in cm (phones 0) */
  over: [number, number];
  cover: THREE.MeshStandardMaterial; label: THREE.MeshStandardMaterial;
  inside: THREE.MeshStandardMaterial; block: THREE.Material[];
  pageFront: THREE.MeshStandardMaterial; pageBack: THREE.MeshStandardMaterial;
  rightPage: THREE.MeshStandardMaterial; leftPage: THREE.MeshStandardMaterial;
}

export const LABEL_CM: [number, number] = [LABEL.w * W, LABEL.w * W * LABEL.aspect];
const THREAD_CM = 0.06; // ~16 threads per 1cm tile -> a very fine weave

// web (Kim): covers overhang the pages by ~2-3% on every side (SQUARE alone is 1.5-1.9%): the boards grow,
// the page block and its page layout stay as they are
const WEB_OVER: [number, number] = [0.16, 0.16];

let printedBy: Record<string, { right: HTMLCanvasElement; left: HTMLCanvasElement; blank: HTMLCanvasElement; edgeFore: HTMLCanvasElement; edgeEnds: HTMLCanvasElement; cover: HTMLCanvasElement; label: HTMLCanvasElement }> = {};

/** `web`: the desktop layout (decided once per page load). Phones keep the original materials untouched. */
export function useBookMaterials(web = false): BookMaterials {
  const gl = useThree(s => s.gl), invalidate = useThree(s => s.invalidate);
  const m = useMemo(() => {
    const pw = 1024, ph = Math.round(1024 * PAGE_D / (W - 0.35));
    const key = web ? "web" : "phone";
    printedBy[key] ??= (() => {
      const right = canvas(pw, ph), left = canvas(pw, ph), blank = canvas(512, Math.round(512 * PAGE_D / W));
      const edgeFore = canvas(8, 1024), edgeEnds = canvas(256, 1024);
      drawRightPage(right, web); drawLeftPage(left, web); drawBlankPage(blank, web); drawPageEdges(edgeFore, false, web); drawPageEdges(edgeEnds, true, web);
      const cover = canvas(COVER_W, COVER_H), label = canvas(1400, Math.round(1400 * LABEL.aspect));
      return { right, left, blank, edgeFore, edgeEnds, cover, label };
    })();
    const P = printedBy[key]!;

    // book cloth: very fine weave, matte. uv in cm on the spine and the boards (ExtrudeGeometry world uv)
    const weave = (rep: [number, number], scale = 0.35) => ({ normalMap: canvasTexture(clothNormal(), false, gl, rep), normalScale: new THREE.Vector2(scale, scale) });
    // matte book cloth: weave twice as pronounced as before, faint colour mottling, almost no specular
    // web (Kim): the weave as a colour texture (one texel per thread, low contrast, faint noise) and the same
    // pattern as a bumpMap with a tiny bumpScale; roughness 0.88. Phones keep the normal-mapped cloth.
    const WEAVE_REP = 1 / (256 * THREAD_CM);
    const webCloth = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, envMapIntensity: 0.6, bumpMap: canvasTexture(clothWeave(), false, gl, [WEAVE_REP, WEAVE_REP]), bumpScale: 0.35, ...o });
    const cloth = web
      ? webCloth({ color: lavender(), map: canvasTexture(clothWeave(), true, gl, [WEAVE_REP, WEAVE_REP]) })
      : new THREE.MeshStandardMaterial({ color: lavender(), roughness: 0.92, metalness: 0, envMapIntensity: 0.7, map: canvasTexture(mottleMap(), true, gl, [1 / 9, 1 / 9]), ...weave([1 / (16 * THREAD_CM), 1 / (16 * THREAD_CM)], 0.7) });
    // spine band uv: u = arc length (cm) from the back board's fore edge, v = z (cm, -D/2 .. D/2)
    const spine = (() => {
      if (!web) return cloth;
      const u0 = W - SPINE_TURN, len = BAND_L + 2 * SPINE_TURN, t = canvasTexture(spineMap(len, BAND_L, SPINE_TURN, D), true, gl);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.repeat.set(1 / len, 1 / D); t.offset.set(-u0 / len, 0.5);
      return webCloth({ color: lavender(), map: t });
    })();
    const fibre = (rep: [number, number]) => canvasTexture(paperNormal(), false, gl, rep);
    const inside = new THREE.MeshStandardMaterial({ color: "#F6EFE2", roughness: 0.97, metalness: 0, normalMap: fibre([W / 3, D / 3]), normalScale: new THREE.Vector2(0.2, 0.2) });
    // front cover: the cover art (band, hinge groove, picture, label shadow), the same fine weave on top
    const coverTex = canvasTexture(P.cover, true, gl); coverTex.wrapS = coverTex.wrapT = THREE.ClampToEdgeWrapping;
    // web: the art keeps its colours (no weave drawn into it, so the type stays crisp); the weave is only in the bump,
    // and fainter than on the plain cloth
    const cover = web
      ? webCloth({ map: coverTex, bumpMap: canvasTexture(clothWeave(), false, gl, [W / (256 * THREAD_CM), D / (256 * THREAD_CM)]), bumpScale: 0.22 })
      : new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.92, metalness: 0, envMapIntensity: 0.7, ...weave([W / (16 * THREAD_CM), D / (16 * THREAD_CM)], 0.36) });
    const labelTex = canvasTexture(P.label, true, gl); labelTex.wrapS = labelTex.wrapT = THREE.ClampToEdgeWrapping;
    const label = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.97, metalness: 0, normalMap: fibre([2, 1]), normalScale: new THREE.Vector2(0.15, 0.15) });
    loadCoverAssets().then(a => {
      drawCover(P.cover, a, { withLabel: false, weave: false }); drawLabel(P.label, a.logo);
      coverTex.needsUpdate = true; labelTex.needsUpdate = true; invalidate();
    });

    // paper: warm cream, fibre normal, completely matte
    const paper = (map: HTMLCanvasElement, side: THREE.Side, flipU = false) => {
      const t = canvasTexture(map, true, gl); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      if (flipU) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; } // back face: un-mirror
      return new THREE.MeshStandardMaterial({ map: t, side, roughness: web ? 0.95 : 0.97, metalness: 0, normalMap: fibre([W / 3, D / 3]), normalScale: new THREE.Vector2(0.25, 0.25) });
    };
    const pageFront = paper(P.blank, THREE.FrontSide), pageBack = paper(P.blank, THREE.BackSide, true);
    // printed pages: right = the page under the turning sheets; left = back of the last turned sheet
    const rightPage = paper(P.right, THREE.FrontSide), leftPage = paper(P.left, THREE.BackSide, true);

    // page block faces: [+x fore edge, -x spine side, +y top, -y, +z tail, -z head]
    const edge = (cv: HTMLCanvasElement) => new THREE.MeshStandardMaterial({ map: canvasTexture(cv, true, gl, [1, 1]), roughness: web ? 0.95 : 0.97, metalness: 0 });
    const plain = new THREE.MeshStandardMaterial({ color: web ? "#F4EDE1" : "#EFE4D2", roughness: web ? 0.95 : 0.97 });
    const ends = edge(P.edgeEnds);
    return { cloth, spine, over: web ? WEB_OVER : [0, 0] as [number, number], cover, label, inside, pageFront, pageBack, rightPage, leftPage, block: [edge(P.edgeFore), plain, plain, plain, ends, ends] };
  }, [gl, invalidate, web]);
  useEffect(() => () => { Object.values(m).flat().forEach(x => { if (x instanceof THREE.Material) x.dispose(); }); }, [m]);
  return m;
}
