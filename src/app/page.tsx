import { ChefHat, Sparkles, Stethoscope, Wrench, Lock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function Page() {
  const industries = [
    {
      name: 'HoReCa',
      description: 'Оборудование, Продукты, Тендеры',
      icon: ChefHat,
      status: 'active',
      href: '/horeca',
      buttonText: 'Войти',
    },
    {
      name: 'Бьюти индустрия',
      description: 'Косметика, Оборудование, Услуги',
      icon: Sparkles,
      status: 'coming-soon',
    },
    {
      name: 'Медтех',
      description: 'Медицинское оборудование, Технологии',
      icon: Stethoscope,
      status: 'coming-soon',
    },
    {
      name: 'Строительство и ремонт',
      description: 'Материалы, Инструменты, Услуги',
      icon: Wrench,
      status: 'coming-soon',
    },
  ];

  return (
    <div className="blueprint-background min-h-screen">
      <main className="px-4 pb-20">
        {/* Hero Section */}
        <section className="max-w-5xl mx-auto pt-16 pb-12 text-center relative z-10">
          <div className="flex flex-col items-center justify-center gap-8">
            {/* Logo from brand asset */}
            <div className="flex items-center justify-center">
              <Image
                src="/logo-hero.png"
                alt="EXPO 365 B2B Platform"
                width={340}
                height={230}
                priority
                className="object-contain"
              />
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0B2B5E] leading-tight tracking-tight">
              Первая российская многоотраслевая B2B-сеть непрерывных продаж.
            </h1>

            {/* Sub-headline */}
            <div className="max-w-3xl mx-auto">
              <p className="text-lg sm:text-xl text-[#0B2B5E]/65 leading-relaxed font-light">
                Твоя отрасль. Твои контакты. Твои возможности.<br />
                365 дней в году.
              </p>
            </div>
          </div>
        </section>

        {/* Industry Cards Section */}
        <section className="max-w-6xl mx-auto px-0 sm:px-4 py-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {industries.map((industry, index) => {
              const IconComponent = industry.icon;
              const isActive = industry.status === 'active';

              return (
                <div key={index} className="group h-full">
                  {isActive ? (
                    <Link href={industry.href ?? '/'} className="block h-full">
                      <div className="h-full rounded-3xl border-2 border-brand-orange bg-white/95 backdrop-blur-sm p-6 shadow-lg transition-all duration-300 hover:shadow-[0_8px_40px_rgba(242,101,34,0.28)] hover:bg-brand-orange/5 hover:scale-105 cursor-pointer">
                        <div className="flex flex-col h-full">
                          <div className="text-center pb-4 flex-grow">
                            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-blue text-white group-hover:bg-brand-orange transition-colors duration-300">
                              <IconComponent className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-brand-blue mb-2">{industry.name}</h3>
                            <p className="text-sm text-slate-600 leading-6">
                              {industry.description}
                            </p>
                          </div>
                          <Button className="w-full bg-brand-orange text-white hover:bg-brand-orange/90 rounded-2xl font-semibold">
                            {industry.buttonText}
                          </Button>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="h-full rounded-3xl border-2 border-slate-400 bg-white/40 backdrop-blur-sm p-6 shadow-md opacity-60">
                      <div className="flex flex-col h-full">
                        <div className="text-center pb-4 flex-grow">
                          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-slate-300 text-slate-400">
                            <IconComponent className="h-8 w-8" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-500 mb-2">{industry.name}</h3>
                          <p className="text-sm text-slate-500 leading-6">
                            {industry.description}
                          </p>
                        </div>
                        <div className="inline-flex items-center justify-center gap-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-500 bg-slate-100/50">
                          <Lock className="h-4 w-4" />
                          Скоро
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto px-4 mt-20 pt-8 border-t border-[#0B2B5E]/15">
          <p className="text-center text-sm text-[#0B2B5E]/45 tracking-wide">
            © 2026 EXPO 365 · B2B Platform
          </p>
        </footer>
      </main>
    </div>
  );
}

