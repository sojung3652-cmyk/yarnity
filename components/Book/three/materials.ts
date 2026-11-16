"use client";
// Materials for the cloth hardcover: lavender book cloth (spine, back, the band turned onto the front),
// the printed front cover, a paper label, cream endpapers and paper. All matte: book cloth roughness
// 0.85 with a very fine woven normal map, paper fully matte, metalness 0 everywhere.
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { COVER_H, COVER_W, drawCover, drawLabel, LABEL, LAVENDER, loadCoverAssets } from "../coverArt";
import { D, W } from "./geometry";
import { canvas, drawBlankPage, drawLeftPage, drawPageEdges, drawRightPage, PAGE_D } from "./paperTextures";
import { canvasTexture, clothNormal, paperNormal } from "./textures";

export interface BookMaterials {
  cloth: THREE.MeshStandardMaterial;
  cover: THREE.MeshStandardMaterial; label: THREE.MeshStandardMaterial;
  inside: THREE.MeshStandardMaterial; block: THREE.Material[];
  pageFront: THREE.MeshStandardMaterial; pageBack: THREE.MeshStandardMaterial;
  rightPage: THREE.MeshStandardMaterial; leftPage: THREE.MeshStandardMaterial;
}

export const LABEL_CM: [number, number] = [LABEL.w * W, LABEL.w * W * LABEL.aspect];
const THREAD_CM = 0.06; // ~16 threads per 1cm tile -> a very fine weave

let printed: { right: HTMLCanvasElement; left: HTMLCanvasElement; blank: HTMLCanvasElement; edgeFore: HTMLCanvasElement; edgeEnds: HTMLCanvasElement; cover: HTMLCanvasElement; label: HTMLCanvasElement } | null = null;

export function useBookMaterials(): BookMaterials {
  const gl = useThree(s => s.gl), invalidate = useThree(s => s.invalidate);
  const m = useMemo(() => {
    const pw = 1024, ph = Math.round(1024 * PAGE_D / (W - 0.35));
    printed ??= (() => {
      const right = canvas(pw, ph), left = canvas(pw, ph), blank = canvas(512, Math.round(512 * PAGE_D / W));
      const edgeFore = canvas(8, 1024), edgeEnds = canvas(256, 1024);
      drawRightPage(right); drawLeftPage(left); drawBlankPage(blank); drawPageEdges(edgeFore, false); drawPageEdges(edgeEnds, true);
      const cover = canvas(COVER_W, COVER_H), label = canvas(1400, Math.round(1400 * LABEL.aspect));
      return { right, left, blank, edgeFore, edgeEnds, cover, label };
    })();
    const P = printed;

    // book cloth: very fine weave, matte. uv in cm on the spine and the boards (ExtrudeGeometry world uv)
    const weave = (rep: [number, number], scale = 0.35) => ({ normalMap: canvasTexture(clothNormal(), false, gl, rep), normalScale: new THREE.Vector2(scale, scale) });
    const cloth = new THREE.MeshStandardMaterial({ color: LAVENDER, roughness: 0.85, metalness: 0, ...weave([1 / (16 * THREAD_CM), 1 / (16 * THREAD_CM)]) });
    const fibre = (rep: [number, number]) => canvasTexture(paperNormal(), false, gl, rep);
    const inside = new THREE.MeshStandardMaterial({ color: "#F6EFE2", roughness: 0.97, metalness: 0, normalMap: fibre([W / 3, D / 3]), normalScale: new THREE.Vector2(0.2, 0.2) });
    // front cover: the cover art (band, hinge groove, picture, label shadow), the same fine weave on top
    const coverTex = canvasTexture(P.cover, true, gl); coverTex.wrapS = coverTex.wrapT = THREE.ClampToEdgeWrapping;
    const cover = new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.85, metalness: 0, ...weave([W / (16 * THREAD_CM), D / (16 * THREAD_CM)], 0.18) });
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
      return new THREE.MeshStandardMaterial({ map: t, side, roughness: 0.97, metalness: 0, normalMap: fibre([W / 3, D / 3]), normalScale: new THREE.Vector2(0.25, 0.25) });
    };
    const pageFront = paper(P.blank, THREE.FrontSide), pageBack = paper(P.blank, THREE.BackSide, true);
    // printed pages: right = the page under the turning sheets; left = back of the last turned sheet
    const rightPage = paper(P.right, THREE.FrontSide), leftPage = paper(P.left, THREE.BackSide, true);

    // page block faces: [+x fore edge, -x spine side, +y top, -y, +z tail, -z head]
    const edge = (cv: HTMLCanvasElement) => new THREE.MeshStandardMaterial({ map: canvasTexture(cv, true, gl, [1, 1]), roughness: 0.97, metalness: 0 });
    const plain = new THREE.MeshStandardMaterial({ color: "#F6EFE2", roughness: 0.97 });
    const ends = edge(P.edgeEnds);
    return { cloth, cover, label, inside, pageFront, pageBack, rightPage, leftPage, block: [edge(P.edgeFore), plain, plain, plain, ends, ends] };
  }, [gl, invalidate]);
  useEffect(() => () => { Object.values(m).flat().forEach(x => { if (x instanceof THREE.Material) x.dispose(); }); }, [m]);
  return m;
}
