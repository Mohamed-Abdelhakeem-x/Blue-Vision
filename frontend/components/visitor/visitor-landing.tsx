"use client";

import {useState, useRef, useCallback, useLayoutEffect, useMemo, type TouchEvent, type PointerEvent} from "react";
import {Link} from "@/i18n/navigation";
import {motion} from "framer-motion";
import {ArrowRight, ChevronLeft, ChevronRight, CircleUserRound} from "lucide-react";
import {useTranslations} from "next-intl";

const TESTIMONIALS = [
  {
    quote: "Plantify helped our field team standardize early detection across all sites.",
    author: "Mariam Hassan",
    role: "Operations Manager"
  },
  {
    quote: "The product is fast, clear, and easy to roll out to non-technical staff.",
    author: "Khaled Mostafa",
    role: "Regional Agronomist"
  },
  {
    quote: "The interface feels modern and focused. We adopted it in one week.",
    author: "Nour El Din",
    role: "Farm Technology Lead"
  }
];

const TEAM_NAMES = ["Nagh", "Aya", "Hady", "Abd Elghany", "Ahmed Bahaa", "Omar Radwan"];
const CAROUSEL_GAP = 12;
const SWIPE_THRESHOLD = 44;

const fadeUp = {
  hidden: {opacity: 0, y: 20},
  show: {opacity: 1, y: 0}
};

export function VisitorLanding() {
  const t = useTranslations("landing");
  const missionPoints = [
    {
      title: t("missionItem1Title"),
      body: t("missionItem1Body")
    },
    {
      title: t("missionItem2Title"),
      body: t("missionItem2Body")
    },
    {
      title: t("missionItem3Title"),
      body: t("missionItem3Body")
    }
  ];
  const team = TEAM_NAMES.map((name, index) => ({
    name,
    role: t(`teamRole${index + 1}`)
  }));
  const teamTrack = useMemo(() => [...team, ...team, ...team], [team]);

  // -- team carousel ------------------------------------------------
  const [carousel, setCarousel] = useState<{idx: number; x: number; visible: number}>({
    idx: TEAM_NAMES.length,
    x: 0,
    visible: 3
  });
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselIdxRef = useRef(TEAM_NAMES.length);
  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef(0);
  const pointerStartXRef = useRef<number | null>(null);
  const pointerDeltaXRef = useRef(0);
  const draggingRef = useRef(false);

  const recalcCarousel = useCallback((idx: number) => {
    const el = carouselRef.current;
    if (!el) return;
    const W = el.offsetWidth;
    const vis = W < 540 ? 1 : W < 900 ? 2 : 3;
    const cardW = (W - (vis - 1) * CAROUSEL_GAP) / vis;
    const i = idx;
    carouselIdxRef.current = i;
    setCarousel({idx: i, x: -(i * (cardW + CAROUSEL_GAP)), visible: vis});
  }, []);

  useLayoutEffect(() => {
    recalcCarousel(TEAM_NAMES.length);
    const el = carouselRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => recalcCarousel(carouselIdxRef.current));
    ro.observe(el);
    return () => ro.disconnect();
  }, [recalcCarousel]);

  const normalizeCarousel = useCallback(() => {
    const total = TEAM_NAMES.length;
    if (carouselIdxRef.current >= total * 2) {
      recalcCarousel(carouselIdxRef.current - total);
    } else if (carouselIdxRef.current < total) {
      recalcCarousel(carouselIdxRef.current + total);
    }
  }, [recalcCarousel]);

  const onTeamTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
    touchDeltaXRef.current = 0;
  }, []);

  const onTeamTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null) return;
    const currentX = event.touches[0]?.clientX;
    if (currentX === undefined) return;
    touchDeltaXRef.current = currentX - touchStartXRef.current;
  }, []);

  const onTeamTouchEnd = useCallback(() => {
    const delta = touchDeltaXRef.current;
    if (Math.abs(delta) < SWIPE_THRESHOLD) {
      touchStartXRef.current = null;
      touchDeltaXRef.current = 0;
      return;
    }

    if (delta < 0) {
      recalcCarousel(carouselIdxRef.current + 1);
    } else {
      recalcCarousel(carouselIdxRef.current - 1);
    }

    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
  }, [recalcCarousel]);

  const onTeamPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    draggingRef.current = true;
    pointerStartXRef.current = event.clientX;
    pointerDeltaXRef.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onTeamPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    if (!draggingRef.current || pointerStartXRef.current === null) return;
    pointerDeltaXRef.current = event.clientX - pointerStartXRef.current;
  }, []);

  const onTeamPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    if (!draggingRef.current) return;
    const delta = pointerDeltaXRef.current;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      if (delta < 0) {
        recalcCarousel(carouselIdxRef.current + 1);
      } else {
        recalcCarousel(carouselIdxRef.current - 1);
      }
    }

    draggingRef.current = false;
    pointerStartXRef.current = null;
    pointerDeltaXRef.current = 0;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, [recalcCarousel]);
  // -----------------------------------------------------------------

  return (
    <main className="relative mx-auto max-w-7xl px-6 pb-14 pt-16 md:px-8 md:pt-20">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute left-[-12rem] top-0 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl"
          animate={{y: [0, -18, 0], x: [0, 10, 0]}}
          transition={{duration: 8, repeat: Infinity, ease: "easeInOut"}}
        />
        <motion.div
          className="absolute bottom-16 right-[-10rem] h-72 w-72 rounded-full bg-zinc-500/10 blur-3xl"
          animate={{y: [0, 16, 0], x: [0, -12, 0]}}
          transition={{duration: 9, repeat: Infinity, ease: "easeInOut"}}
        />
      </div>

      <section className="mx-auto max-w-3xl text-center">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{duration: 0.35}}
          className="mb-4 text-xs font-semibold uppercase tracking-[0.26em] text-[var(--text-tertiary)]"
        >
            {t("eyebrow")}
          </motion.p>
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{duration: 0.45, delay: 0.05}}
          className="text-balance text-4xl font-semibold leading-[1.08] text-[var(--text-primary)] md:text-6xl"
        >
            {t("title")}
          </motion.h1>
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{duration: 0.45, delay: 0.12}}
          className="mx-auto mt-6 max-w-2xl text-base tracking-[0.02em] text-[var(--text-secondary)] md:text-lg"
        >
            {t("subtitle")}
          </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{duration: 0.35, delay: 0.2}}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
            <motion.div
              animate={{y: [0, -3, 0]}}
              transition={{duration: 2.4, repeat: Infinity, ease: "easeInOut"}}
            >
              <Link
              href="/dashboard"
              className="inline-flex h-11 items-center rounded-lg bg-[#2563eb] px-5 text-sm font-semibold text-zinc-50 transition-transform duration-150 hover:bg-[#1d4ed8] hover:text-zinc-50 active:scale-[0.98]"
            >
              {t("ctaPrimary")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            </motion.div>
          </motion.div>
      </section>

      <section id="mission" className="mt-20">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{t("missionEyebrow")}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">
            {t("missionTitle")}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {missionPoints.map((point, index) => (
            <motion.article
              key={point.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{once: true, amount: 0.25}}
              transition={{duration: 0.35, delay: index * 0.06}}
              whileHover={{y: -4, scale: 1.01}}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5"
            >
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]">{point.title}</h3>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">{point.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="testimonials" className="mt-20">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{t("testimonialsEyebrow")}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">{t("testimonialsTitle")}</h2>
        </div>

        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max gap-3 animate-testimonial-marquee">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((item, index) => (
              <article
                key={`${item.author}-${index}`}
                className="w-[16.5rem] sm:w-[20rem] rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5"
              >
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">&quot;{item.quote}&quot;</p>
                <div className="mt-5">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{item.author}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{item.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="team" className="mt-20">
        <div className="flex items-start justify-between mb-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{t("teamEyebrow")}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">{t("teamTitle")}</h2>
          </div>
          <div className="flex items-center gap-2 mt-1 shrink-0">
            <button
              onClick={() => recalcCarousel(carousel.idx - 1)}
              aria-label="Previous team members"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => recalcCarousel(carousel.idx + 1)}
              aria-label="Next team members"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="overflow-hidden touch-pan-y select-none"
          onTouchStart={onTeamTouchStart}
          onTouchMove={onTeamTouchMove}
          onTouchEnd={onTeamTouchEnd}
          onPointerDown={onTeamPointerDown}
          onPointerMove={onTeamPointerMove}
          onPointerUp={onTeamPointerUp}
          onPointerCancel={onTeamPointerUp}
        >
          <motion.div
            className="flex w-full"
            style={{gap: `${CAROUSEL_GAP}px`}}
            animate={{x: carousel.x}}
            transition={{type: "spring", stiffness: 280, damping: 28, mass: 0.8}}
            onAnimationComplete={normalizeCarousel}
          >
            {teamTrack.map((member, index) => (
              <article
                key={`${member.name}-${index}`}
                className="flex-shrink-0 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5"
                style={{width: `calc((100% - ${(carousel.visible - 1) * CAROUSEL_GAP}px) / ${carousel.visible})`}}
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)]">
                  <CircleUserRound className="h-5 w-5 text-[var(--text-secondary)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{member.name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{member.role}</p>
              </article>
            ))}
          </motion.div>
        </div>
      </section>

    </main>
  );
}
