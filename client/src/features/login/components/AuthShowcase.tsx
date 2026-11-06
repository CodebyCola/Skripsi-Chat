import { AUTH_ASSETS } from '../constants/auth.constants';
import { AuthStep } from '../types/auth.types';

interface AuthShowcaseProps {
  step: AuthStep;
  username: string;
  isDongleActiveAndValid?: boolean;
  isFaceMatched?: boolean;
  similarityPct?: number;
}

export function AuthShowcase({
  step,
  isDongleActiveAndValid,
  isFaceMatched,
  similarityPct = 0,
}: AuthShowcaseProps) {
  let artworkUrl = AUTH_ASSETS.step1Artwork;
  let statusBadgeText = 'Tahap 1 dari 3';
  let headline = 'Bimbingan Skripsi Aman & Terenkripsi Multi-Faktor';

  if (step === 2) {
    artworkUrl = AUTH_ASSETS.step1Artwork;
    statusBadgeText = 'Tahap 2 dari 3';
  } else if (step === 3) {
    artworkUrl = AUTH_ASSETS.step1Artwork;
    statusBadgeText = 'Autentikasi Berhasil';
  }

  return (
    <aside className="col-span-12 lg:col-span-5 flex flex-col justify-between bg-surface rounded-3xl p-space-lg md:p-space-xl border border-border-subtle shadow-[0_1px_3px_0_rgba(28,40,35,0.04)] relative overflow-hidden self-stretch">
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-surface-container-low rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-primary-fixed/30 rounded-full blur-3xl opacity-40 pointer-events-none" />

      <div className="relative z-10 flex flex-col">
        {/* Brand Badge Header */}
        <div className="flex items-center justify-between gap-space-sm pb-space-md">
          <div className="flex items-center gap-space-sm">
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-primary leading-none tracking-tight">
                SkripsiChat
              </span>
              <span className="font-label-sm text-label-sm text-text-secondary mt-0.5">
                Secure Advisory Network
              </span>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-label-sm font-label-sm  text-primary font-semibold tracking-wide">
            {statusBadgeText}
          </span>
        </div>

        {/* Academic Consultation Illustration */}
        <div className="mt-space-md group relative rounded-2xl overflow-hidden border border-border-subtle shadow-sm aspect-[4/3] bg-surface-container-lowest">
          <img
            alt="Ilustrasi akademik bimbingan skripsi aman"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            src={artworkUrl}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent opacity-40 pointer-events-none" />
        </div>

        {/* Core Headline & Synopsis */}
        <div className="mt-space-lg">
          <h1 className="font-headline-lg text-headline-lg text-on-surface leading-tight tracking-tight">
            {headline}
          </h1>
        </div>
      </div>
    </aside>
  );
}
