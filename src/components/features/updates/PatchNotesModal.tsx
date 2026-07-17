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
        <div className="space-y-6 text-foreground max-h-[70vh] pr-2 overflow-y-auto scrollbar-thin scrollbar-thumb-glass">
          {/* Header */}
          <div className="border-b border-glass pb-4">
            <h3 className="text-2xl md:text-3xl font-black italic tracking-tight text-white uppercase">
              {t('home.endofz.patchnotes.title')}
            </h3>
            <p className="text-sm md:text-base text-foreground/60 mt-2 font-medium">
              {t('home.endofz.patchnotes.subtitle')}
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {/* Combat Section */}
            <div className="space-y-3">
              <h4 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-xl">swords</span>
                {t('home.endofz.patchnotes.sections.combat.title')}
              </h4>
              <ul className="list-disc pl-5 space-y-1.5 text-foreground/80 text-sm md:text-base leading-relaxed">
                <li>{t('home.endofz.patchnotes.sections.combat.bullet1')}</li>
                <li>{t('home.endofz.patchnotes.sections.combat.bullet2')}</li>
                <li>{t('home.endofz.patchnotes.sections.combat.bullet3')}</li>
                <li>{t('home.endofz.patchnotes.sections.combat.bullet4')}</li>
              </ul>
            </div>

            {/* RPG Section */}
            <div className="space-y-3">
              <h4 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-xl">stars</span>
                {t('home.endofz.patchnotes.sections.rpg.title')}
              </h4>
              <ul className="list-disc pl-5 space-y-1.5 text-foreground/80 text-sm md:text-base leading-relaxed">
                <li>{t('home.endofz.patchnotes.sections.rpg.bullet1')}</li>
                <li>{t('home.endofz.patchnotes.sections.rpg.bullet2')}</li>
                <li>{t('home.endofz.patchnotes.sections.rpg.bullet3')}</li>
              </ul>
            </div>

            {/* Content Section */}
            <div className="space-y-3">
              <h4 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-xl">rocket_launch</span>
                {t('home.endofz.patchnotes.sections.content.title')}
              </h4>
              <ul className="list-disc pl-5 space-y-1.5 text-foreground/80 text-sm md:text-base leading-relaxed">
                <li>{t('home.endofz.patchnotes.sections.content.bullet1')}</li>
                <li>{t('home.endofz.patchnotes.sections.content.bullet2')}</li>
                <li>{t('home.endofz.patchnotes.sections.content.bullet3')}</li>
                <li>{t('home.endofz.patchnotes.sections.content.bullet4')}</li>
              </ul>
            </div>

            {/* Visuals Section */}
            <div className="space-y-3">
              <h4 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="material-symbols-rounded text-xl">palette</span>
                {t('home.endofz.patchnotes.sections.visuals.title')}
              </h4>
              <ul className="list-disc pl-5 space-y-1.5 text-foreground/80 text-sm md:text-base leading-relaxed">
                <li>{t('home.endofz.patchnotes.sections.visuals.bullet1')}</li>
                <li>{t('home.endofz.patchnotes.sections.visuals.bullet2')}</li>
                <li>{t('home.endofz.patchnotes.sections.visuals.bullet3')}</li>
                <li>{t('home.endofz.patchnotes.sections.visuals.bullet4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
