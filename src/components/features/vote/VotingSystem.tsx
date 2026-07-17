import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../i18n';
import ConfirmDialog from '../../ui/ConfirmDialog';
import InfoDialog from '../../ui/InfoDialog';
import Button from '../../ui/Button';
import { Progress, ProgressLabel, ProgressValue } from '../../ui/Progress';

// Import assets
import zamasuImage from '../../../assets/glind-race(zamasu).png';
import moroImage from '../../../assets/goetian-race(moro).jpg';
import tsufuruImage from '../../../assets/tsufuru-race(baby).jpg';

// Event start time (Set to slightly in the future for testing or a fixed date)
// For manual verification, we can set this to Date.now() + 5000 (5 seconds) if needed, 
// but we'll use a fixed future date (e.g. tomorrow) as default, and the user can change it.
const START_TIME = new Date('2026-07-10T17:00:00-05:00').getTime();

type RaceId = 'zamasu' | 'moro' | 'tsufuru';

interface RaceOption {
  id: RaceId;
  name: string;
  image: string;
  descKey: string;
}

const races: RaceOption[] = [
  { id: 'zamasu', name: 'Glind (Zamasu)', image: zamasuImage.src, descKey: 'votePage.zamasuDesc' },
  { id: 'moro', name: 'Goetian (Moro)', image: moroImage.src, descKey: 'votePage.moroDesc' },
  { id: 'tsufuru', name: 'Tsufuru (Baby)', image: tsufuruImage.src, descKey: 'votePage.tsufuruDesc' },
];

export default function VotingSystem() {
  const { t } = useLanguage();
  const [hasStarted, setHasStarted] = useState(Date.now() >= START_TIME);
  const [votedRace, setVotedRace] = useState<RaceId | null>(null);
  const [selectedRace, setSelectedRace] = useState<RaceId | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Mock results for statistics
  const [results, setResults] = useState<Record<RaceId, number>>({
    zamasu: 45,
    moro: 30,
    tsufuru: 25,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() >= START_TIME) {
        setHasStarted(true);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVoteClick = (id: RaceId) => {
    setSelectedRace(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmVote = () => {
    if (selectedRace) {
      // Add a mock vote to the results
      setResults(prev => ({
        ...prev,
        [selectedRace]: prev[selectedRace] + 1
      }));
      setVotedRace(selectedRace);
      setIsInfoOpen(true);
    }
  };

  if (!hasStarted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
        <h2 className="text-3xl md:text-5xl font-black text-foreground italic tracking-tight" data-i18n="votePage.beforeStartTitle">
          {t('votePage.beforeStartTitle')}
        </h2>
        <p className="text-foreground/70 text-lg md:text-xl max-w-2xl" data-i18n="votePage.beforeStartDesc">
          {t('votePage.beforeStartDesc')}
        </p>
        <div className="mt-8 px-10 py-6 bg-surface-elevated border border-glass rounded-3xl shadow-glow">
          <p className="text-primary font-bold text-2xl" data-i18n="votePage.scheduleText">
            {t('votePage.scheduleText')}
          </p>
        </div>
      </div>
    );
  }

  if (votedRace) {
    const totalVotes = Object.values(results).reduce((a, b) => a + b, 0);

    return (
      <div className="flex flex-col items-center py-12 max-w-3xl mx-auto w-full">
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-foreground italic tracking-tight uppercase" data-i18n="votePage.statsTitle">
            {t('votePage.statsTitle')}
          </h2>
          <p className="text-foreground/70 text-lg" data-i18n="votePage.statsDesc">
            {t('votePage.statsDesc')}
          </p>
          <p className="text-foreground/50 text-sm">
            {totalVotes} <span data-i18n="votePage.totalVotes">{t('votePage.totalVotes')}</span>
          </p>
        </div>

        <div className="w-full space-y-8 bg-surface-elevated border border-glass rounded-[2rem] p-8 shadow-card">
          {races.map((race) => {
            const votes = results[race.id];
            const percentage = totalVotes === 0 ? 0 : (votes / totalVotes) * 100;
            return (
              <div key={race.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={race.image} alt={race.name} className="w-10 h-10 rounded-full object-cover border border-glass" />
                    <ProgressLabel className="text-lg font-bold">{race.name}</ProgressLabel>
                  </div>
                  <ProgressValue value={percentage} className="text-lg font-black text-primary" />
                </div>
                <Progress value={percentage} className="h-3" />
              </div>
            );
          })}
        </div>

        <InfoDialog
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
          title={t('votePage.successTitle')}
          description={t('votePage.successDesc')}
          buttonLabel={t('common.close')}
        />
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {races.map((race) => (
          <div key={race.id} className="flex flex-col bg-surface-elevated border border-glass rounded-[2rem] overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-2 group">
            <div className="relative h-64 overflow-hidden">
              <img src={race.image} alt={race.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent"></div>
              <h3 className="absolute bottom-6 left-6 text-2xl font-black text-white italic tracking-wide drop-shadow-md">
                {race.name}
              </h3>
            </div>
            <div className="p-6 flex flex-col flex-1 justify-between gap-6">
              <p className="text-foreground/80 leading-relaxed font-medium min-h-[80px]" data-i18n={race.descKey}>
                {t(race.descKey as any)}
              </p>
              <Button variant="primary" size="lg" className="w-full shadow-glow" onClick={() => handleVoteClick(race.id)}>
                <span className="material-symbols-rounded mr-2">how_to_vote</span>
                <span data-i18n="votePage.voteButton">{t('votePage.voteButton')}</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmVote}
        title={t('votePage.confirmTitle')}
        description={t('votePage.confirmDesc')}
      />
    </div>
  );
}
