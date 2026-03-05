import { useState, useMemo, useCallback } from 'react';
import { generatePathways, ClusterColor } from '@/data/pathwayData';
import NetworkGraph from '@/components/NetworkGraph';
import PathwayAnimation from '@/components/PathwayAnimation';
import { AnimatePresence, motion } from 'framer-motion';
import { Dna } from 'lucide-react';

type AppView = 'overview' | 'expanding' | 'animation';

const Index = () => {
  const pathways = useMemo(() => generatePathways(), []);
  const [view, setView] = useState<AppView>('overview');
  const [selectedCluster, setSelectedCluster] = useState<ClusterColor | null>(null);

  const handleClusterSelect = useCallback((color: ClusterColor) => {
    setSelectedCluster(color);
    setView('expanding');
  }, []);

  const handleExpansionComplete = useCallback(() => {
    setView('animation');
  }, []);

  const handleBack = useCallback(() => {
    setView('overview');
    setSelectedCluster(null);
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <header className="px-6 py-3 flex items-center gap-3" style={{ background: '#000' }}>
        <Dna className="w-5 h-5 text-primary" />
        <h1 className="font-mono font-bold text-foreground text-sm tracking-wide">
          PATHWAY<span className="text-primary">SCOPE</span>
        </h1>
        <span className="text-muted-foreground text-xs font-mono ml-2">v1.0</span>
      </header>

      <main className="flex-1 flex items-center justify-center overflow-hidden" style={{ background: '#000' }}>
        <AnimatePresence mode="wait">
          {(view === 'overview' || view === 'expanding') && (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              className="w-full flex items-center justify-center"
            >
              <NetworkGraph
                pathways={pathways}
                onClusterSelect={handleClusterSelect}
                selectedCluster={selectedCluster}
                expandingCluster={view === 'expanding' ? selectedCluster : null}
                onExpansionComplete={handleExpansionComplete}
              />
            </motion.div>
          )}
          {view === 'animation' && selectedCluster && (
            <motion.div
              key="animation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full flex items-center justify-center"
            >
              <PathwayAnimation cluster={selectedCluster} onBack={handleBack} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
