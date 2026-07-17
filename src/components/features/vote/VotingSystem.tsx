import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../i18n';
import ConfirmDialog from '../../ui/ConfirmDialog';
import InfoDialog from '../../ui/InfoDialog';
import Button from '../../ui/Button';
import { Progress, ProgressLabel, ProgressValue } from '../../ui/Progress';

import zamasuImage from '../../../assets/glind-race(zamasu).png';
import moroImage from '../../../assets/goetian-race(moro).jpg';
import tsufuruImage from '../../../assets/tsufuru-race(baby).jpg';

const START_TIME = new Date('2026-07-10T17:00:00-05:00').getTime();

type RaceId = 'zamasu' | 'moro' | 'tsufuru';

interface RaceOption {
  id: RaceId;
  name: string;
  image: string;
  descKey: string;
}

const races: RaceOption[] = [
  { id: 'zamasu', name: 'Glind (Zamasu)', image: zamasuImage.src, descKey: 'votepage.zamasu_desc' },
  { id: 'moro', name: 'Goetian (Moro)', image: moroImage.src, descKey: 'votepage.moro_desc' },
  { id: 'tsufuru', name: 'Tsufuru (Baby)', image: tsufuruImage.src, descKey: 'votepage.tsufuru_desc' },
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
        <h2 className="text-3xl md:text-5xl font-black text-foreground italic tracking-tight" data-i18n="votepage.before_start_title">
          {t('votepage.before_start_title')}
        </h2>
        <p className="text-foreground/70 text-lg md:text-xl max-w-2xl" data-i18n="votepage.before_start_desc">
          {t('votepage.before_start_desc')}
        </p>
        <div className="mt-8 px-10 py-6 bg-surface-elevated border border-glass rounded-3xl shadow-glow">
          <p className="text-primary font-bold text-2xl" data-i18n="votepage.schedule_text">
            {t('votepage.schedule_text')}
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
          <h2 className="text-3xl md:text-5xl font-black text-foreground italic tracking-tight uppercase" data-i18n="votepage.stats_title">
            {t('votepage.stats_title')}
          </h2>
          <p className="text-foreground/70 text-lg" data-i18n="votepage.stats_desc">
            {t('votepage.stats_desc')}
          </p>
          <p className="text-foreground/50 text-sm">
            {totalVotes} <span data-i18n="votepage.total_votes">{t('votepage.total_votes')}</span>
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
          title={t('votepage.success_title')}
          description={t('votepage.success_desc')}
          buttonLabel={t('common.close')}
        />
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {races.map((race) => (
          <div key={race.id} className="relative flex flex-col min-h-[28rem] rounded-[2rem] overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-2 group border border-glass">
            <img src={race.image} alt={race.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 z-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-0"></div>

            <div className="relative z-10 p-6 flex flex-col h-full justify-end gap-4 mt-auto">
              <h3 className="text-3xl font-black text-foreground italic tracking-wide drop-shadow-md text-center">
                {race.name}
              </h3>
              <p className="text-foreground/90 leading-relaxed font-medium min-h-[80px]" data-i18n={race.descKey}>
                {t(race.descKey as any)}
              </p>
              <Button variant="primary" size="lg" className="w-full shadow-glow mt-2" onClick={() => handleVoteClick(race.id)}>
                <span className="material-symbols-rounded mr-2">how_to_vote</span>
                <span data-i18n="votepage.vote_button">{t('votepage.vote_button')}</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmVote}
        title={t('votepage.confirm_title')}
        description={t('votepage.confirm_desc')}
      />
    </div>
  );
}
