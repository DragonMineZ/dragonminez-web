import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../i18n';
import { useAuth, SignInButton } from "@clerk/astro/react";
import ConfirmDialog from '../../ui/ConfirmDialog';
import SuccessAlert from '../../ui/SuccessAlert';
import InfoDialog from '../../ui/InfoDialog';
import Button from '../../ui/Button';
import { Progress, ProgressLabel, ProgressValue } from '../../ui/Progress';

// Import assets
import zamasuImage from '../../../assets/glind-race(zamasu).png';
import moroImage from '../../../assets/goetian-race(moro).jpg';
import tsufuruImage from '../../../assets/tsufuru-race(baby).jpg';
import zamasuHead from '../../../assets/vote/zamasu-head.png';
import moroHead from '../../../assets/vote/moro-head.png';
import tsufuruHead from '../../../assets/vote/tsufuru-head.png';


type RaceId = 'glind' | 'goetian' | 'tsufuru';

interface RaceOption {
  id: RaceId;
  name: string;
  image: string;
  headImage: string;
  descKey: string;
}

const races: RaceOption[] = [
  { id: 'glind', name: 'Glind (Zamasu)', image: zamasuImage.src, headImage: zamasuHead.src, descKey: 'votepage.zamasu_desc' },
  { id: 'goetian', name: 'Goetian (Moro)', image: moroImage.src, headImage: moroHead.src, descKey: 'votepage.moro_desc' },
  { id: 'tsufuru', name: 'Tsufuru (Baby)', image: tsufuruImage.src, headImage: tsufuruHead.src, descKey: 'votepage.tsufuru_desc' },
];

interface VotingSystemProps {
  initialResults: {
    status: string;
    winner: string | null;
    results: Record<string, number>;
  };
  initialVotedRace: RaceId | null;
}

export default function VotingSystem({ initialResults, initialVotedRace }: VotingSystemProps) {
  const { t } = useLanguage();
  const { isSignedIn } = useAuth();
  const [status, setStatus] = useState(initialResults.status);
  const [winner, setWinner] = useState<RaceId | null>(initialResults.winner as RaceId | null);
  const [votedRace, setVotedRace] = useState<RaceId | null>(initialVotedRace);
  const [selectedRace, setSelectedRace] = useState<RaceId | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Results for statistics
  const [results, setResults] = useState<Record<string, number>>({
    glind: initialResults.results?.glind ?? 0,
    goetian: initialResults.results?.goetian ?? 0,
    tsufuru: initialResults.results?.tsufuru ?? 0,
  });

  // Poll for live stats in the background
  useEffect(() => {
    if (status === 'ended') return;

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/vote');
        if (res.ok) {
          const data = await res.json();
          setResults(data.results);
          setStatus(data.status);
          if (data.winner) setWinner(data.winner as RaceId);
          if (data.votedRace && data.votedRace !== votedRace) {
            setVotedRace(data.votedRace as RaceId);
          }
        }
      } catch (err) {
        console.error('Error fetching vote statistics', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // every 10s
    return () => clearInterval(interval);
  }, [status, votedRace]);

  const handleVoteClick = (id: RaceId) => {
    if (!isSignedIn) {
      setIsAuthOpen(true);
      return;
    }
    setSelectedRace(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmVote = async () => {
    if (!selectedRace) return;

    setLoading(true);
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ race: selectedRace }),
      });

      if (res.ok) {
        setVotedRace(selectedRace);
        setIsInfoOpen(true);
        // Refresh results immediately
        const statsRes = await fetch('/api/vote');
        if (statsRes.ok) {
          const data = await statsRes.json();
          setResults(data.results);
        }
      } else {
        const errorData = await res.json();
        console.error('Failed to vote:', errorData.error);
      }
    } catch (err) {
      console.error('Error voting:', err);
    } finally {
      setLoading(false);
      setIsConfirmOpen(false);
    }
  };

  if (status === 'upcoming') {
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

  if (status === 'ended' && winner) {
    const winningRace = races.find(r => r.id === winner);
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-8 w-full max-w-4xl mx-auto">
        <div className="space-y-4 mb-8">
          <h2 className="text-4xl md:text-6xl font-black text-primary italic tracking-tight drop-shadow-glow" data-i18n="votepage.ended_title">
            {t('votepage.ended_title')}
          </h2>
          <p className="text-foreground/80 text-xl font-medium" data-i18n="votepage.winner_subtitle">
            {t('votepage.winner_subtitle')}
          </p>
        </div>
        
        {winningRace && (
          <div className="relative group overflow-hidden rounded-[2.5rem] border-2 border-primary shadow-glow-strong w-full max-w-md mx-auto">
            <img 
              src={winningRace.image} 
              alt={winningRace.name} 
              className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
            <div className="absolute bottom-0 inset-x-0 p-8 flex flex-col items-center text-center">
              <span className="text-primary font-black text-4xl italic drop-shadow-hero uppercase tracking-widest">
                {winningRace.name}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
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
            const votes = results[race.id] ?? 0;
            const percentage = totalVotes === 0 ? 0 : (votes / totalVotes) * 100;
            return (
              <div key={race.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={race.headImage} alt={race.name} className="w-12 h-12 rounded-xl object-cover border border-glass" />
                    <ProgressLabel className="text-lg font-bold">{race.name}</ProgressLabel>
                  </div>
                  <ProgressValue value={percentage} className="text-lg font-black text-foreground" />
                </div>
                <Progress value={percentage} className="h-3" />
              </div>
            );
          })}
        </div>

        <SuccessAlert
          show={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
          message={t('votepage.success_title')}
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

      <InfoDialog
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        title={t('hairSalon.authRequiredTitle')}
        description={t('hairSalon.authRequiredDesc')}
      >
        <SignInButton mode="modal" className="text-foreground hover:underline cursor-pointer text-lg font-bold bg-transparent border-none p-0">
          <span data-i18n="hairSalon.loginToPublish">{t('hairSalon.loginToPublish')}</span>
        </SignInButton>
      </InfoDialog>
    </div>
  );
}
