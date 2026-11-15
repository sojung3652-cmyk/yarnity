"use client";
// Materials for the WebGL book (step 2: placeholders; knit maps come in step 3).
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { D, W } from "./geometry";

export interface BookMaterials {
  knit: THREE.Material; edge: THREE.Material; board: THREE.Material; endpaper: THREE.Material;
  panel: THREE.MeshStandardMaterial; pages: THREE.Material[];
}

export const COVER_SRC = "/pic/bird.png";
const PANEL_ASPECT = (W - 2 * 0.07 * W) / (D - 2 * 0.07 * W);

/** object-fit: cover for a texture on a plane of the given aspect. */
export function coverFit(tex: THREE.Texture, planeAspect: number) {
  const img = tex.image as { width: number; height: number }, ia = img.width / img.height;
  tex.repeat.set(1, 1); tex.offset.set(0, 0);
  if (ia > planeAspect) { tex.repeat.x = planeAspect / ia; tex.offset.x = (1 - tex.repeat.x) / 2; }
  else { tex.repeat.y = ia / planeAspect; tex.offset.y = (1 - tex.repeat.y) / 2; }
}

export function useBookMaterials(): BookMaterials {
  const m = useMemo(() => {
    const knit = new THREE.MeshStandardMaterial({ color: "#B29CD9", roughness: 0.92, metalness: 0 });
    const panel = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, metalness: 0 });
    new THREE.TextureLoader().load(COVER_SRC, t => { t.colorSpace = THREE.SRGBColorSpace; coverFit(t, PANEL_ASPECT); panel.map = t; panel.needsUpdate = true; });
    const paper = new THREE.MeshStandardMaterial({ color: "#FBF8F2", roughness: 0.95 });
    const edgeSide = new THREE.MeshStandardMaterial({ color: "#EFE8DC", roughness: 0.95 });
    return {
      knit, edge: knit, panel,
      board: new THREE.MeshStandardMaterial({ color: "#E9E1D6", roughness: 0.9 }),
      endpaper: paper,
      pages: [edgeSide, edgeSide, paper, paper, edgeSide, edgeSide],
    };
  }, []);
  useEffect(() => () => { Object.values(m).flat().forEach(x => (x as THREE.Material).dispose()); }, [m]);
  return m;
}
