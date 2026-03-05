import { useState, useMemo, useCallback } from 'react';
import { generatePathways, ClusterColor, ProteinNode, CLUSTER_LABELS, CLUSTER_COLORS } from '@/data/pathwayData';
import NetworkGraph from '@/components/NetworkGraph';
import PathwayDetail from '@/components/PathwayDetail';
import PathwayAnimation from '@/components/PathwayAnimation';
import { AnimatePresence, motion } from 'framer-motion';
import { Dna, X, Star } from 'lucide-react';

type AppView = 'animation' | 'overview' | 'detail';

const Index = () => {
  const pathways = useMemo(() => generatePathways(), []);
  const [view, setView] = useState<AppView>('animation');
  const [selectedCluster, setSelectedCluster] = useState<ClusterColor | null>(null);
  const [rescuedProteins, setRescuedProteins] = useState<ProteinNode[]>([]);

  const handleClusterSelect = useCallback((color: ClusterColor) => {
    setSelectedCluster(color);
    setView('detail');
  }, []);

  const handleBack = useCallback(() => {
    setView('overview');
    setSelectedCluster(null);
  }, []);

  const handleSelectProtein = useCallback((protein: ProteinNode) => {
    setRescuedProteins(prev => {
      if (prev.find(p => p.id === protein.id)) return prev;
      return [...prev, protein];
    });
  }, []);

  const removeRescued = useCallback((id: string) => {
    setRescuedProteins(prev => prev.filter(p => p.id !== id));
  }, []);

  const selectedPathway = pathways.find(p => p.color === selectedCluster);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border px-6 py-3 flex items-center gap-3">
        <Dna className="w-5 h-5 text-primary" />
        <h1 className="font-mono font-bold text-foreground text-sm tracking-wide">
          PATHWAY<span className="text-primary">SCOPE</span>
        </h1>
        <span className="text-muted-foreground text-xs font-mono ml-2">v1.0</span>
        {rescuedProteins.length > 0 && (
          <div className="ml-auto flex items-center gap-1 text-xs font-mono text-primary">
            <Star className="w-3 h-3" />
            {rescuedProteins.length} rescued
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          <AnimatePresence mode="wait">
            {view === 'animation' ? (
              <motion.div
                key="animation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full"
              >
                <PathwayAnimation />
              </motion.div>
            ) : view === 'overview' ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <NetworkGraph
                  pathways={pathways}
                  onClusterSelect={handleClusterSelect}
                  selectedCluster={selectedCluster}
                />
              </motion.div>
            ) : selectedPathway ? (
              <PathwayDetail
                key={selectedCluster}
                pathway={selectedPathway}
                onBack={handleBack}
                onSelectProtein={handleSelectProtein}
              />
            ) : null}
          </AnimatePresence>
        </main>

        {/* Rescued proteins sidebar */}
        {rescuedProteins.length > 0 && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            className="border-l border-border bg-card p-4 overflow-auto"
          >
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
              Rescued Proteins
            </h3>
            <div className="flex flex-col gap-2">
              {rescuedProteins.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: CLUSTER_COLORS[p.cluster] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono font-semibold text-foreground truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{CLUSTER_LABELS[p.cluster]}</div>
                  </div>
                  <span className="text-[9px] uppercase text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                    {p.role === 'target' ? 'TGT' : p.role === 'intermediary' ? 'INT' : 'EFF'}
                  </span>
                  <button
                    onClick={() => removeRescued(p.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.aside>
        )}
      </div>
    </div>
  );
};

export default Index;
