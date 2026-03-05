export type ClusterColor = 'teal' | 'blue' | 'orange' | 'purple';

export interface ProteinNode {
  id: string;
  name: string;
  fullName: string;
  x: number;
  y: number;
  cluster: ClusterColor;
  radius: number;
  role: 'target' | 'intermediary' | 'effector';
  description: string;
  connections: string[];
}

export interface PathwayEdge {
  source: string;
  target: string;
  weight: number;
}

export interface Pathway {
  id: string;
  name: string;
  color: ClusterColor;
  description: string;
  nodes: ProteinNode[];
  edges: PathwayEdge[];
}

export const CLUSTER_COLORS: Record<ClusterColor, string> = {
  teal: 'hsl(170, 80%, 50%)',
  blue: 'hsl(210, 90%, 60%)',
  orange: 'hsl(25, 95%, 58%)',
  purple: 'hsl(270, 60%, 58%)',
};

export const CLUSTER_LABELS: Record<ClusterColor, string> = {
  teal: 'PI3K/AKT Signaling',
  blue: 'MAPK/ERK Pathway',
  orange: 'NF-κB Pathway',
  purple: 'JAK/STAT Pathway',
};

function generateClusterNodes(cluster: ClusterColor, cx: number, cy: number, count: number): ProteinNode[] {
  const names: Record<ClusterColor, string[]> = {
    teal: ['PIK3CA', 'AKT1', 'PTEN', 'mTOR', 'PDK1', 'TSC2', 'RHEB', 'S6K1', 'GSK3β', '4E-BP1', 'FOXO3', 'BAD'],
    blue: ['BRAF', 'MEK1', 'ERK2', 'RAS', 'RAF1', 'SOS1', 'GRB2', 'SHC1', 'RSK2', 'ELK1', 'MYC', 'FOS'],
    orange: ['NFKB1', 'IKBKB', 'RELA', 'TNF', 'TRAF2', 'NIK', 'IKKα', 'BCL3', 'CARD11', 'TAK1', 'MYD88', 'IRAK4'],
    purple: ['JAK1', 'JAK2', 'STAT3', 'STAT5', 'SOCS1', 'TYK2', 'PIAS1', 'SHP2', 'CIS', 'STAM2', 'GAS6', 'IFNGR'],
  };
  const fullNames: Record<ClusterColor, string[]> = {
    teal: ['Phosphatidylinositol-4,5-Bisphosphate 3-Kinase', 'AKT Serine/Threonine Kinase 1', 'Phosphatase And Tensin Homolog', 'Mechanistic Target Of Rapamycin', 'Pyruvate Dehydrogenase Kinase 1', 'TSC Complex Subunit 2', 'Ras Homolog Enriched In Brain', 'Ribosomal Protein S6 Kinase B1', 'Glycogen Synthase Kinase 3 Beta', 'Eukaryotic Translation Factor 4E-BP1', 'Forkhead Box O3', 'BCL2 Associated Agonist Of Cell Death'],
    blue: ['B-Raf Proto-Oncogene', 'MAP Kinase Kinase 1', 'Mitogen-Activated Protein Kinase 1', 'GTPase KRas', 'RAF Proto-Oncogene', 'SOS Ras/Rac Guanine Nucleotide Exchange Factor 1', 'Growth Factor Receptor Bound 2', 'SHC Adaptor Protein 1', 'Ribosomal Protein S6 Kinase A3', 'ETS Transcription Factor ELK1', 'MYC Proto-Oncogene', 'Fos Proto-Oncogene'],
    orange: ['Nuclear Factor Kappa B Subunit 1', 'Inhibitor Of Kappa B Kinase Subunit Beta', 'RELA Proto-Oncogene', 'Tumor Necrosis Factor', 'TNF Receptor Associated Factor 2', 'NF-Kappa-B-Inducing Kinase', 'Inhibitor Of Kappa B Kinase Alpha', 'B-Cell Lymphoma 3', 'CARD11 Scaffold Protein', 'TGF-Beta Activated Kinase 1', 'MYD88 Innate Immune Signal', 'IRAK4 Kinase'],
    purple: ['Janus Kinase 1', 'Janus Kinase 2', 'Signal Transducer 3', 'Signal Transducer 5', 'Suppressor Of Cytokine Signaling 1', 'Tyrosine Kinase 2', 'Protein Inhibitor Of STAT 1', 'Src Homology Phosphatase 2', 'Cytokine-Inducible SH2', 'Signal Transducing Adaptor 2', 'Growth Arrest Specific 6', 'Interferon Gamma Receptor'],
  };
  const roles: ('target' | 'intermediary' | 'effector')[] = ['target', 'intermediary', 'intermediary', 'effector', 'intermediary', 'effector', 'intermediary', 'effector', 'intermediary', 'effector', 'target', 'intermediary'];

  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 30 + Math.random() * 80;
    return {
      id: `${cluster}-${i}`,
      name: names[cluster][i] || `P${i}`,
      fullName: fullNames[cluster][i] || `Protein ${i}`,
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      cluster,
      radius: 3 + Math.random() * 5,
      role: roles[i % roles.length],
      description: `Key ${roles[i % roles.length]} in the ${CLUSTER_LABELS[cluster]} pathway`,
      connections: [],
    };
  });
}

function generateEdges(nodes: ProteinNode[]): PathwayEdge[] {
  const edges: PathwayEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const conns = 1 + Math.floor(Math.random() * 3);
    for (let c = 0; c < conns; c++) {
      const j = (i + 1 + Math.floor(Math.random() * (nodes.length - 1))) % nodes.length;
      if (i !== j) {
        edges.push({ source: nodes[i].id, target: nodes[j].id, weight: 0.3 + Math.random() * 0.7 });
        nodes[i].connections.push(nodes[j].id);
        nodes[j].connections.push(nodes[i].id);
      }
    }
  }
  return edges;
}

export function generatePathways(): Pathway[] {
  const clusters: { color: ClusterColor; cx: number; cy: number }[] = [
    { color: 'teal', cx: 130, cy: 120 },
    { color: 'blue', cx: 380, cy: 110 },
    { color: 'orange', cx: 400, cy: 340 },
    { color: 'purple', cx: 120, cy: 360 },
  ];

  return clusters.map(({ color, cx, cy }) => {
    const nodes = generateClusterNodes(color, cx, cy, 12);
    const edges = generateEdges(nodes);
    return {
      id: color,
      name: CLUSTER_LABELS[color],
      color,
      description: `Biological signaling pathway involving key regulatory proteins`,
      nodes,
      edges,
    };
  });
}

// Cross-cluster edges for the overview
export function generateCrossEdges(pathways: Pathway[]): PathwayEdge[] {
  const edges: PathwayEdge[] = [];
  for (let i = 0; i < pathways.length; i++) {
    for (let j = i + 1; j < pathways.length; j++) {
      const count = 2 + Math.floor(Math.random() * 4);
      for (let c = 0; c < count; c++) {
        const src = pathways[i].nodes[Math.floor(Math.random() * pathways[i].nodes.length)];
        const tgt = pathways[j].nodes[Math.floor(Math.random() * pathways[j].nodes.length)];
        edges.push({ source: src.id, target: tgt.id, weight: 0.1 + Math.random() * 0.3 });
      }
    }
  }
  return edges;
}
