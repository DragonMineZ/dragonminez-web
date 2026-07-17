import React, { useState } from 'react';
import Modal from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { useLanguage } from '../../../i18n/useLanguage';

export default function PatchNotesModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <Button 
        variant="primary" 
        size="lg" 
        className="gap-3" 
        onClick={() => setIsOpen(true)}
      >
        <span className="material-symbols-rounded text-xl">article</span>
        <span data-i18n="home.endofz.cta">{t('home.endofz.cta')}</span>
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="space-y-6 text-foreground max-h-[70vh] pr-2 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Header */}
          <div className="border-b border-glass pb-4">
            <h3 className="text-2xl md:text-3xl font-black italic tracking-tight text-foreground uppercase" data-i18n="home.endofz.patchNotes.title">
              {t('home.endofz.patchNotes.title')}
            </h3>
            <p className="text-sm md:text-base text-foreground/60 mt-2 font-medium" data-i18n="home.endofz.patchNotes.subtitle">
              {t('home.endofz.patchNotes.subtitle')}
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {/* Combat Section */}
            <div className="space-y-3">
              <h4 className="text-lg md:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span className="material-symbols-rounded text-xl">swords</span>
                <span data-i18n="home.endofz.patchNotes.sections.combat.title">{t('home.endofz.patchNotes.sections.combat.title')}</span>
              </h4>
              <ul className="list-disc pl-5 space-y-1.5 text-foreground/80 text-sm md:text-base leading-relaxed">
                <li data-i18n="home.endofz.patchNotes.sections.combat.bullet1">{t('home.endofz.patchNotes.sections.combat.bullet1')}</li>
                <li data-i18n="home.endofz.patchNotes.sections.combat.bullet2">{t('home.endofz.patchNotes.sections.combat.bullet2')}</li>
                <li data-i18n="home.endofz.patchNotes.sections.combat.bullet3">{t('home.endofz.patchNotes.sections.combat.bullet3')}</li>
                <li data-i18n="home.endofz.patchNotes.sections.combat.bullet4">{t('home.endofz.patchNotes.sections.combat.bullet4')}</li>
              </ul>
            </div>

            {/* RPG Section */}
            <div className="space-y-3">
              <h4 className="text-lg md:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span className="material-symbols-rounded text-xl">stars</span>
                <span data-i18n="home.endofz.patchNotes.sections.rpg.title">{t('home.endofz.patchNotes.sections.rpg.title')}</span>
              </h4>
              <ul className="list-disc pl-5 space-y-1.5 text-foreground/80 text-sm md:text-base leading-relaxed">
                <li data-i18n="home.endofz.patchNotes.sections.rpg.bullet1">{t('home.endofz.patchNotes.sections.rpg.bullet1')}</li>
                <li data-i18n="home.endofz.patchNotes.sections.rpg.bullet2">{t('home.endofz.patchNotes.sections.rpg.bullet2')}</li>
                <li data-i18n="home.endofz.patchNotes.sections.rpg.bullet3">{t('home.endofz.patchNotes.sections.rpg.bullet3')}</li>
              </ul>
            </div>

            {/* Content Section */}
            <div className="space-y-3">
              <h4 className="text-lg md:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span className="material-symbols-rounded text-xl">rocket_launch</span>
                <span data-i18n="home.endofz.patchNotes.sections.content.title">{t('home.endofz.patchNotes.sections.content.title')}</span>
              </h4>
              <ul className="list-disc pl-5 space-y-1.5 text-foreground/80 text-sm md:text-base leading-relaxed">
                <li data-i18n="home.endofz.patchNotes.sections.content.bullet1">{t('home.endofz.patchNotes.sections.content.bullet1')}</li>
                <li data-i18n="home.endofz.patchNotes.sections.content.bullet2">{t('home.endofz.patchNotes.sections.content.bullet2')}</li>
                <li data-i18n="home.endofz.patchNotes.sections.content.bullet3">{t('home.endofz.patchNotes.sections.content.bullet3')}</li>
                <li data-i18n="home.endofz.patchNotes.sections.content.bullet4">{t('home.endofz.patchNotes.sections.content.bullet4')}</li>
              </ul>
            </div>

            {/* Visuals Section */}
            <div className="space-y-3">
              <h4 className="text-lg md:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span className="material-symbols-rounded text-xl">palette</span>
                <span data-i18n="home.endofz.patchNotes.sections.visuals.title">{t('home.endofz.patchNotes.sections.visuals.title')}</span>
              </h4>
              <ul className="list-disc pl-5 space-y-1.5 text-foreground/80 text-sm md:text-base leading-relaxed">
                <li data-i18n="home.endofz.patchNotes.sections.visuals.bullet1">{t('home.endofz.patchNotes.sections.visuals.bullet1')}</li>
                <li data-i18n="home.endofz.patchNotes.sections.visuals.bullet2">{t('home.endofz.patchNotes.sections.visuals.bullet2')}</li>
                <li data-i18n="home.endofz.patchNotes.sections.visuals.bullet3">{t('home.endofz.patchNotes.sections.visuals.bullet3')}</li>
                <li data-i18n="home.endofz.patchNotes.sections.visuals.bullet4">{t('home.endofz.patchNotes.sections.visuals.bullet4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
