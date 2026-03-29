'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BracketSlot, BracketTeam, FirstFourMatchup, Team } from '@/types/models';

type BracketSetupState = {
  regions: Record<string, BracketSlot[]>;
  firstFourMatchups: FirstFourMatchup[];
  regionOrder: Record<string, number>;
  selectedTeams: Set<string> | string[];
  firstFourOut: (Team | undefined)[];
  nextFourOut: (Team | undefined)[];
};

type PicksByRegion = Record<string, Record<number, (string | null)[]>>;

type FinalFourPicks = {
    semi: [string | null, string | null];
    title: [string | null];
}

const ROUND1_PAIRINGS: [number, number][] = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [6, 11],
  [3, 14],
  [7, 10],
  [2, 15],
];

const ROUND_MATCHUP_COUNTS: Record<number, number> = { 1: 8, 2: 4, 3: 2, 4: 1 };

const slotSlideStyles = `
  @keyframes bracketSlideInLeft {
    0% { transform: translate3d(-22%, 0, 0); opacity: 0; }
    100% { transform: translate3d(0, 0, 0); opacity: 1; }
  }

  @keyframes bracketSlideInRight {
    0% { transform: translate3d(22%, 0, 0); opacity: 0; }
    100% { transform: translate3d(0, 0, 0); opacity: 1; }
  }

  .bracket-slide-in-left,
  .bracket-slide-in-right {
    will-change: transform, opacity;
    backface-visibility: hidden;
  }

  .bracket-slide-in-left {
    animation: bracketSlideInLeft 0.4s ease-out;
  }

  .bracket-slide-in-right {
    animation: bracketSlideInRight 0.4s ease-out;
  }
`;

function initRegionPicks(): Record<number, (string | null)[]> {
  return {
    1: Array(8).fill(null),
    2: Array(4).fill(null),
    3: Array(2).fill(null),
    4: Array(1).fill(null),
  };
}

type RegionBracketProps = {
    regionName: string;
    flipped?: boolean;
    getRoundParticipants: (
        regionName: string,
        round: number
    ) => [BracketTeam | undefined, BracketTeam | undefined][];
    getValidWinner: (
        regionName: string,
        round: number,
        matchupIdx: number,
        participants: [BracketTeam | undefined, BracketTeam | undefined]
    ) => BracketTeam | undefined;
    onPickWinner: (regionName: string, round: number, matchupIdx: number, teamId: string) => void;
    picks: PicksByRegion;
    firstFourWinners: Record<string, string>;
}

const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const normalized =
        clean.length === 3
        ? clean.split('').map((c) => c + c).join('')
        : clean;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return { r, g, b };
};

function AutoTeamName({
  displayName,
  abbreviation,
  className = '',
}: {
  displayName: string;
  abbreviation?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [useAbbreviation, setUseAbbreviation] = useState(false);

  useLayoutEffect(() => {
    const abbr = abbreviation?.trim();

    const checkFit = () => {
      const container = containerRef.current;
      const measure = measureRef.current;
      if (!container || !measure) return;

      // measure displayName in same inherited font context
      const availableWidth = container.clientWidth;
      const neededWidth = measure.getBoundingClientRect().width;

      setUseAbbreviation(Boolean(abbr) && neededWidth > availableWidth);
    };

    // initial + next paint (helps after layout settles)
    checkFit();
    const raf = requestAnimationFrame(checkFit);

    const ro = new ResizeObserver(checkFit);
    if (containerRef.current) ro.observe(containerRef.current);

    window.addEventListener('resize', checkFit);

    // re-check after fonts finish loading (important for edge cases like "High Point")
    let removeFontListener: (() => void) | undefined;
    if ('fonts' in document) {
      document.fonts.ready.then(checkFit).catch(() => {});
      const onFontsDone = () => checkFit();
      document.fonts.addEventListener?.('loadingdone', onFontsDone);
      removeFontListener = () => document.fonts.removeEventListener?.('loadingdone', onFontsDone);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', checkFit);
      removeFontListener?.();
    };
  }, [displayName, abbreviation]);

  return (
    <span ref={containerRef} className={`relative flex-1 min-w-0 ${className}`}>
      <span
        ref={measureRef}
        aria-hidden
        className="absolute invisible pointer-events-none whitespace-nowrap"
      >
        {displayName}
      </span>

      <span className="block truncate">
        {useAbbreviation ? abbreviation?.trim() : displayName}
      </span>
    </span>
  );
}

function RegionBracket({
    regionName,
    flipped = false,
    getRoundParticipants,
    getValidWinner,
    onPickWinner,
    picks,
    firstFourWinners,
}: RegionBracketProps) {
  const rounds = [1, 2, 3, 4] as const;

  const SLOT_H = 30;
  const SLOT_GAP = 4;
  const CARD_PAD_Y = 8;
  const CARD_H = CARD_PAD_Y * 2 + SLOT_H * 2 + SLOT_GAP;
  const BASE_GAP = 10;
  const D = CARD_H + BASE_GAP;
  const ROUND1_COUNT = 8;
  const columnHeight = ROUND1_COUNT * CARD_H + (ROUND1_COUNT - 1) * BASE_GAP;
  const HEADER_H = 40;
  const totalHeight = HEADER_H + columnHeight;

  const BASE_COL_W = 160;
  const BASE_COL_GAP = 16;
  const baseBracketWidth = BASE_COL_W * 4 + BASE_COL_GAP * 3;

  const frameRef = useRef<HTMLDivElement>(null);
  const [hScale, setHScale] = useState(1);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const updateScale = () => {
      const available = el.clientWidth;
      const next = Math.min(1, Math.max(0.62, available / baseBracketWidth));
      setHScale(next);
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseBracketWidth]);

  const COL_W = Math.round(BASE_COL_W * hScale);
  const COL_GAP = Math.round(BASE_COL_GAP * hScale);
  const bracketWidth = COL_W * 4 + COL_GAP * 3;

  const showTeamText = hScale > 0.78;

  const getMatchupTop = (round: number, matchupIdx: number) => {
    const factor = 2 ** (round - 1);
    return ((factor - 1) * D) / 2 + matchupIdx * factor * D;
  };

  const getRoundX = (round: number) => {
    const logicalIndex = round - 1;
    const visualIndex = flipped ? 3 - logicalIndex : logicalIndex;
    return visualIndex * (COL_W + COL_GAP);
  };

  const getTeamSlotStyles = (team: BracketTeam, outcome: 'pending' | 'won' | 'lost') => {
    const isWinner = outcome === 'won';
    const isLoser = outcome === 'lost';

    const rgb = hexToRgb(team.primaryColor);

    return {
      shellStyle: {
        backgroundColor: '#d1d5db',
        borderColor: isLoser
          ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`
          : `#${team.primaryColor.replace('#', '')}`,
        boxShadow: isWinner ? 'inset 0 0 0 2px rgba(255,255,255,0.6)' : undefined,
      } as React.CSSProperties,
      fillStyle: {
        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.72)`,
        color: '#ffffff',
      } as React.CSSProperties,
    };
  };

  // Detect newly populated slots (or changed teams) and animate those buttons
  const [animatingSlotKeys, setAnimatingSlotKeys] = useState<Set<string>>(new Set());
  const prevSlotIdsRef = useRef<Record<string, string | null>>({});

  const currentSlotIds = useMemo(() => {
    const map: Record<string, string | null> = {};
    rounds.forEach((round) => {
      const participants = getRoundParticipants(regionName, round);
      participants.forEach((pair, matchupIdx) => {
        map[`${regionName}-${round}-${matchupIdx}-0`] = pair[0]?.id ?? null;
        map[`${regionName}-${round}-${matchupIdx}-1`] = pair[1]?.id ?? null;
      });
    });
    return map;
  }, [regionName, rounds, picks, firstFourWinners]);

  useLayoutEffect(() => {
    const prev = prevSlotIdsRef.current;
    const nextAnimating = new Set<string>();

    Object.entries(currentSlotIds).forEach(([key, currentId]) => {
      const prevId = prev[key] ?? null;
      if (currentId && currentId !== prevId) {
        nextAnimating.add(key);
      }
    });

    prevSlotIdsRef.current = currentSlotIds;

    if (nextAnimating.size === 0) return;
    setAnimatingSlotKeys(nextAnimating);

    const timer = setTimeout(() => {
      setAnimatingSlotKeys(new Set());
    }, 400);

    return () => clearTimeout(timer);
  }, [currentSlotIds]);

  return (
    <div className="rounded-lg border-2 border-gray-600 bg-gray-300/50 p-4">
      <h3 className={`text-xl font-bold text-black mb-4`}>{regionName} Region</h3>

      <div ref={frameRef} className="w-full">
        <div className="relative" style={{ width: `${bracketWidth}px`, height: `${totalHeight}px` }}>
          {/* Connector lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={bracketWidth}
            height={totalHeight}
            viewBox={`0 0 ${bracketWidth} ${totalHeight}`}
          >
            {[1, 2, 3].map((round) => {
              const matchupCount = ROUND_MATCHUP_COUNTS[round + 1];
              return Array.from({ length: matchupCount }).map((_, parentIdx) => {
                const child1Idx = parentIdx * 2;
                const child2Idx = parentIdx * 2 + 1;

                const y1 = HEADER_H + getMatchupTop(round, child1Idx) + CARD_H / 2;
                const y2 = HEADER_H + getMatchupTop(round, child2Idx) + CARD_H / 2;
                const yParent = HEADER_H + getMatchupTop(round + 1, parentIdx) + CARD_H / 2;

                if (!flipped) {
                  const xChildRight = getRoundX(round) + COL_W;
                  const xParentLeft = getRoundX(round + 1);
                  const xMid = (xChildRight + xParentLeft) / 2;

                  return (
                    <g key={`r${round}-p${parentIdx}`} stroke="#6b7280" strokeWidth="2" fill="none">
                      <path d={`M ${xChildRight} ${y1} H ${xMid}`} />
                      <path d={`M ${xChildRight} ${y2} H ${xMid}`} />
                      <path d={`M ${xMid} ${y1} V ${y2}`} />
                      <path d={`M ${xMid} ${yParent} H ${xParentLeft}`} />
                    </g>
                  );
                }

                const xChildLeft = getRoundX(round);
                const xParentRight = getRoundX(round + 1) + COL_W;
                const xMid = (xChildLeft + xParentRight) / 2;

                return (
                  <g key={`r${round}-p${parentIdx}`} stroke="#6b7280" strokeWidth="2" fill="none">
                    <path d={`M ${xChildLeft} ${y1} H ${xMid}`} />
                    <path d={`M ${xChildLeft} ${y2} H ${xMid}`} />
                    <path d={`M ${xMid} ${y1} V ${y2}`} />
                    <path d={`M ${xMid} ${yParent} H ${xParentRight}`} />
                  </g>
                );
              });
            })}
          </svg>

          {/* Round columns */}
          {rounds.map((round) => {
            const participants = getRoundParticipants(regionName, round);
            const x = getRoundX(round);

            return (
              <div key={round} className="absolute top-0" style={{ left: `${x}px`, width: `${COL_W}px` }}>
                <div className={`text-sm font-bold text-gray-700 mb-2 h-7 ${flipped ? 'text-right' : 'text-left'}`}>
                  {round === 1 ? 'Round of 64' : round === 2 ? 'Round of 32' : round === 3 ? 'Sweet 16' : 'Elite 8'}
                </div>

                <div className="relative" style={{ height: `${columnHeight}px` }}>
                  {participants.map((pair, matchupIdx) => {
                    const winner = getValidWinner(regionName, round, matchupIdx, pair);
                    const top = getMatchupTop(round, matchupIdx);

                    const renderSlotButton = (team: BracketTeam | undefined, slotIndex: 0 | 1) => {
                      const slotKey = `${regionName}-${round}-${matchupIdx}-${slotIndex}`;
                      const isAnimating = animatingSlotKeys.has(slotKey);
                      const animClass = isAnimating
                        ? (flipped ? 'bracket-slide-in-right' : 'bracket-slide-in-left')
                        : '';

                      if (!team) {
                        return (
                          <button
                            disabled
                            className="w-full relative overflow-hidden text-left text-sm px-2 rounded border bg-gray-300 text-gray-600 border-gray-400 opacity-90 cursor-not-allowed"
                            style={{ height: `${SLOT_H}px` }}
                          >
                            <span className="flex items-center h-full">TBD</span>
                          </button>
                        );
                      }

                      const hasWinner = !!winner;
                        const outcome: 'pending' | 'won' | 'lost' = !hasWinner
                            ? 'pending'
                            : winner.id === team.id
                            ? 'won'
                            : 'lost';

                      const { shellStyle, fillStyle } = getTeamSlotStyles(team, outcome);

                      return (
                        <button
                          onClick={() => onPickWinner(regionName, round, matchupIdx, team.id)}
                          className="w-full relative overflow-hidden text-left text-sm rounded border cursor-pointer"
                          style={{ height: `${SLOT_H}px`, ...shellStyle }}
                        >
                          <div
                            className={`absolute inset-0 flex items-center cursor-pointer ${
                                showTeamText ? 'justify-start gap-2 px-2' : 'justify-center gap-1 px-0'
                            } ${animClass} ${outcome === 'lost' ? 'opacity-80' : 'opacity-100'}`}
                            style={fillStyle}
                            >
                            {showTeamText ? (
                                <>
                                <span className="w-5 shrink-0 text-right font-bold drop-shadow-sm tabular-nums">
                                    {team.seed}
                                </span>
                                <img src={team.alternateLogoURL} alt={team.name} className="w-5 h-5 shrink-0" />
                                <AutoTeamName
                                    displayName={team.displayName}
                                    abbreviation={team.abbreviation}
                                    className="drop-shadow-sm"
                                />
                                </>
                            ) : (
                                <>
                                <span className="shrink-0 font-bold drop-shadow-sm tabular-nums">
                                    {team.seed}
                                </span>
                                <img src={team.alternateLogoURL} alt={team.name} className="w-5 h-5 shrink-0" />
                                </>
                            )}
                            </div>
                        </button>
                      );
                    };

                    return (
                      <div
                        key={`${round}-${matchupIdx}`}
                        className="absolute left-0 right-0 bg-gray-200 rounded border border-gray-500 p-2"
                        style={{ top: `${top}px`, height: `${CARD_H}px` }}
                      >
                        <div className="flex flex-col gap-1">
                          {renderSlotButton(pair[0], 0)}
                          {renderSlotButton(pair[1], 1)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function BracketViewPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<BracketSetupState | null>(null);
  const [firstFourWinners, setFirstFourWinners] = useState<Record<string, string>>({});
  const [picks, setPicks] = useState<PicksByRegion>({});
  const [finalFourPicks, setFinalFourPicks] = useState<FinalFourPicks>({
    semi: [null, null],
    title: [null],
  });

    const isRightSideRegion = (regionName: string, fallbackIndex?: number) => {
        const position = setup?.regionOrder?.[regionName];
        if (position === 2 || position === 3) return true;
        if (position === 1 || position === 4) return false;

        return fallbackIndex === 1 || fallbackIndex === 3;
    }

    const getFirstFourSlotStyles = (team: Team | BracketTeam, outcome: 'pending' | 'won' | 'lost') => {
    const rgb = hexToRgb(team.primaryColor);
    const isWinner = outcome === 'won';
    const isLoser = outcome === 'lost';

    if (!rgb) {
      return {
        shellStyle: {
          backgroundColor: '#d1d5db',
          borderColor: '#9ca3af',
          boxShadow: isWinner ? 'inset 0 0 0 2px rgba(59,130,246,0.45)' : undefined,
        },
        fillStyle: {
          backgroundColor: isLoser ? 'rgba(243,244,246,0.55)' : '#f3f4f6',
          color: '#111827',
        },
      };
    }

    return {
      shellStyle: {
        backgroundColor: '#d1d5db',
        borderColor: isLoser
          ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`
          : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
        boxShadow: isWinner ? 'inset 0 0 0 2px rgba(255,255,255,0.6)' : undefined,
      },
      fillStyle: {
        backgroundColor:`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.72)`,
        color: '#ffffff',
      },
    };
  };

  useEffect(() => {
    const raw = localStorage.getItem('bracketSetup');
    if (!raw) {
      router.push('/bracket/setup');
      return;
    }

    const parsed = JSON.parse(raw) as BracketSetupState;
    setSetup(parsed);

    const initialPicks: PicksByRegion = {};
    Object.keys(parsed.regions).forEach((regionName) => {
      initialPicks[regionName] = initRegionPicks();
    });
    setPicks(initialPicks);
  }, [router]);

  const teamById = useMemo(() => {
    if (!setup) return {};
    const map: Record<string, BracketTeam> = {};

    Object.values(setup.regions).flat().forEach((slot) => {
      if (slot.team) map[slot.team.id] = slot.team;
    });

    setup.firstFourMatchups.forEach((m) => {
      if (m.team1) map[m.team1.id] = m.team1;
      if (m.team2) map[m.team2.id] = m.team2;
    });

    return map;
  }, [setup]);

  const orderedRegionsForGrid = useMemo(() => {
    if (!setup) return [];

    const byPosition: Record<number, string | undefined> = {};
    Object.entries(setup.regionOrder).forEach(([name, pos]) => {
      byPosition[pos] = name;
    });

    // Display order for a 2x2 grid: TL, TR, BL, BR
    const displayPositions = [1, 2, 4, 3];

    const fallback = Object.keys(setup.regions);
    return displayPositions
      .map((p) => byPosition[p])
      .filter(Boolean)
      .concat(fallback.filter((r) => !Object.values(byPosition).includes(r)))
      .slice(0, 4) as string[];
  }, [setup]);

  const getSlotBySeed = (regionName: string, seed: number): BracketSlot | undefined => {
    if (!setup) return undefined;
    return setup.regions[regionName]?.find((s) => s.position === seed);
  };

  const getResolvedSeedTeam = (regionName: string, seed: number): BracketTeam | undefined => {
    if (!setup) return undefined;
    const slot = getSlotBySeed(regionName, seed);
    if (!slot) return undefined;
    if (slot.team) return slot.team;

    const linked = setup.firstFourMatchups.find((m) => m.assignedSlotId === slot.id);
    if (!linked) return undefined;

    const winnerId = firstFourWinners[linked.id];
    if (!winnerId) return undefined;

    return teamById[winnerId];
  };

  const getRoundParticipants = (
    regionName: string,
    round: number
  ): [BracketTeam | undefined, BracketTeam | undefined][] => {
    if (!setup) return [];
    if (round === 1) {
      return ROUND1_PAIRINGS.map(([a, b]) => [getResolvedSeedTeam(regionName, a), getResolvedSeedTeam(regionName, b)]);
    }

    const prev = getRoundParticipants(regionName, round - 1);
    const out: [BracketTeam | undefined, BracketTeam | undefined][] = [];

    for (let i = 0; i < prev.length; i += 2) {
      const left = getValidWinner(regionName, round - 1, i, prev[i]);
      const right = getValidWinner(regionName, round - 1, i + 1, prev[i + 1]);
      out.push([left, right]);
    }

    return out;
  };

  const getValidWinner = (
    regionName: string,
    round: number,
    matchupIdx: number,
    participants: [BracketTeam | undefined, BracketTeam | undefined]
  ): BracketTeam | undefined => {
    const selectedId = picks[regionName]?.[round]?.[matchupIdx];
    if (!selectedId) return undefined;
    const validIds = new Set(participants.filter(Boolean).map((t) => t!.id));
    if (!validIds.has(selectedId)) return undefined;
    return teamById[selectedId];
  };

  const clearFutureRounds = (regionName: string, fromRoundExclusive: number) => {
    setPicks((prev) => {
      const next = { ...prev };
      const currentRegion = { ...(next[regionName] || initRegionPicks()) };
      for (let r = fromRoundExclusive + 1; r <= 4; r++) {
        currentRegion[r] = Array(ROUND_MATCHUP_COUNTS[r]).fill(null);
      }
      next[regionName] = currentRegion;
      return next;
    });
  };

  const onPickWinner = (regionName: string, round: number, matchupIdx: number, teamId: string) => {
    setPicks((prev) => {
      const next = { ...prev };
      const currentRegion = { ...(next[regionName] || initRegionPicks()) };
      const currentRound = [...(currentRegion[round] || Array(ROUND_MATCHUP_COUNTS[round]).fill(null))];
      currentRound[matchupIdx] = teamId;
      currentRegion[round] = currentRound;
      next[regionName] = currentRegion;
      return next;
    });

    clearFutureRounds(regionName, round);
  };

  const onPickFirstFourWinner = (matchup: FirstFourMatchup, winnerId: string) => {
    setFirstFourWinners((prev) => ({ ...prev, [matchup.id]: winnerId }));
    if (matchup.assignedRegion) {
      setPicks((prev) => ({
        ...prev,
        [matchup.assignedRegion]: initRegionPicks(),
      }));
    }
  };

  const eliteEightWinners = useMemo(() => {
    if (!setup) return [undefined, undefined, undefined, undefined] as (BracketTeam | undefined)[];
    return orderedRegionsForGrid.map((regionName) => {
      const eliteEightMatchup = getRoundParticipants(regionName, 4)[0];
      if (!eliteEightMatchup) return undefined;
      return getValidWinner(regionName, 4, 0, eliteEightMatchup);
    });
  }, [orderedRegionsForGrid, picks, firstFourWinners, setup]);

  const finalFourParticipants = useMemo(
    () =>
      [
        [eliteEightWinners[0], eliteEightWinners[2]], // left semifinal
        [eliteEightWinners[1], eliteEightWinners[3]], // right semifinal
      ] as [BracketTeam | undefined, BracketTeam | undefined][],
    [eliteEightWinners]
  );

  const getValidFinalPick = (
    round: 'semi' | 'title',
    matchupIdx: number,
    participants: [BracketTeam | undefined, BracketTeam | undefined]
  ) => {
    const selectedId =
      round === 'semi' ? finalFourPicks.semi[matchupIdx] : finalFourPicks.title[matchupIdx];
    if (!selectedId) return undefined;
    const validIds = new Set(participants.filter(Boolean).map((t) => t!.id));
    return validIds.has(selectedId) ? teamById[selectedId] : undefined;
  };

  const titleParticipants = useMemo(() => {
    const s1 = getValidFinalPick('semi', 0, finalFourParticipants[0]);
    const s2 = getValidFinalPick('semi', 1, finalFourParticipants[1]);
    return [s1, s2] as [BracketTeam | undefined, BracketTeam | undefined];
  }, [finalFourParticipants, finalFourPicks, teamById]);

  const [animatingFinalFourSlotKeys, setAnimatingFinalFourSlotKeys] = useState<Set<string>>(new Set());
  const prevFinalFourSlotIdsRef = useRef<Record<string, string | null>>({});

  const currentFinalFourSlotIds = useMemo(() => {
    const semi0 = finalFourParticipants[0];
    const semi1 = finalFourParticipants[1];

    return {
      'semi-0-0': semi0[0]?.id ?? null,
      'semi-0-1': semi0[1]?.id ?? null,
      'semi-1-0': semi1[0]?.id ?? null,
      'semi-1-1': semi1[1]?.id ?? null,
      'title-0-0': titleParticipants[0]?.id ?? null,
      'title-0-1': titleParticipants[1]?.id ?? null,
    };
  }, [finalFourParticipants, titleParticipants]);

  useLayoutEffect(() => {
    const prev = prevFinalFourSlotIdsRef.current;
    const nextAnimating = new Set<string>();

    Object.entries(currentFinalFourSlotIds).forEach(([key, currentId]) => {
      const prevId = prev[key] ?? null;
      if (currentId && currentId !== prevId) {
        nextAnimating.add(key);
      }
    });

    prevFinalFourSlotIdsRef.current = currentFinalFourSlotIds;

    if (nextAnimating.size === 0) return;

    setAnimatingFinalFourSlotKeys(nextAnimating);

    const timer = setTimeout(() => {
      setAnimatingFinalFourSlotKeys(new Set());
    }, 400);

    return () => clearTimeout(timer);
  }, [currentFinalFourSlotIds]);

  const getFinalFourAnimClass = (round: 'semi' | 'title', matchupIdx: number, slotIndex: number) => {
    const key = `${round}-${matchupIdx}-${slotIndex}`;
    if (!animatingFinalFourSlotKeys.has(key)) return '';

    if (round === 'semi') {
      return matchupIdx === 0 ? 'bracket-slide-in-left' : 'bracket-slide-in-right';
    }

    return slotIndex === 0 ? 'bracket-slide-in-left' : 'bracket-slide-in-right';
  };

  const onPickFinalFourWinner = (
    round: 'semi' | 'title',
    matchupIdx: number,
    teamId: string
  ) => {
    setFinalFourPicks((prev) => {
      if (round === 'semi') {
        const nextSemi: [string | null, string | null] = [...prev.semi] as [string | null, string | null];
        nextSemi[matchupIdx] = teamId;
        return { semi: nextSemi, title: [null] }; // clear title when semi changes
      }

      const nextTitle: [string | null] = [teamId];
      return { ...prev, title: nextTitle };
    });
  };

  if (!setup) {
    return <div className="min-h-screen bg-gray-200 p-6 text-black">Loading bracket...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-200 p-4">
        <style dangerouslySetInnerHTML={{ __html: slotSlideStyles}} />
      <div className="max-w-400 mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-black">Interactive Bracket</h1>
          <button
            onClick={() => router.push('/bracket/setup')}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-800 text-white cursor-pointer"
          >
            Back to Setup
          </button>
        </div>

        {/* First Four */}
        <div className="border-2 border-gray-600 rounded-lg p-4 mb-6 bg-gray-300/50">
          <h2 className="text-xl font-bold text-black mb-3">First Four</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {setup.firstFourMatchups.map((m) => {
              const selected = firstFourWinners[m.id];
              return (
                <div key={m.id} className="bg-gray-200 rounded border border-gray-500 p-3">
                  <div className="text-sm font-semibold text-black mb-2">
                    {m.seed}-Seed Play-In ({m.id})
                  </div>
                    <div className="space-y-2">
                    {(() => {
                        const winnerId = firstFourWinners[m.id];

                        const renderFirstFourTeamSlot = (team: Team | BracketTeam | undefined, slot: 'team1' | 'team2') => {
                        if (!team) {
                            return (
                            <button
                                disabled
                                className="w-full h-10 text-left px-2 rounded border bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed opacity-90"
                            >
                                TBD
                            </button>
                            );
                        }

                        const outcome: 'pending' | 'won' | 'lost' =
                            !winnerId ? 'pending' : winnerId === team.id ? 'won' : 'lost';

                        const { shellStyle, fillStyle } = getFirstFourSlotStyles(team, outcome);
                        const seedValue = (team as BracketTeam).seed ?? m.seed;

                        return (
                            <button
                            onClick={() => onPickFirstFourWinner(m, team.id)}
                            className="w-full h-10 relative overflow-hidden text-left text-sm rounded border cursor-pointer"
                            style={shellStyle}
                            aria-label={`Pick ${team.displayName} from ${slot}`}
                            >
                            <div
                                className={`absolute inset-0 flex items-center gap-2 px-2 ${outcome === 'lost' ? 'opacity-80' : 'opacity-100'}`}
                                style={fillStyle}
                            >
                                <span className="w-5 shrink-0 text-right font-bold tabular-nums">{seedValue}</span>
                                {team.alternateLogoURL ? (
                                <img src={team.alternateLogoURL} alt={team.name} className="w-5 h-5 shrink-0" />
                                ) : null}
                                <span className="flex-1 min-w-0 truncate">{team.displayName}</span>
                            </div>
                            </button>
                        );
                        };

                        return (
                        <>
                            {renderFirstFourTeamSlot(m.team1, 'team1')}
                            {renderFirstFourTeamSlot(m.team2, 'team2')}
                        </>
                        );
                    })()}
                    </div>
                  {m.assignedRegion ? (
                    <div className="text-xs text-gray-700 mt-2">
                      Winner goes to {m.assignedRegion}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Bracket + Final Four */}
        <div className="space-y-6">
          {/* Top regions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {orderedRegionsForGrid.slice(0, 2).map((regionName, idx) => (
              <div key={regionName} className="text-left">
                <RegionBracket
                  regionName={regionName}
                  flipped={isRightSideRegion(regionName, idx)}
                  getRoundParticipants={getRoundParticipants}
                  getValidWinner={getValidWinner}
                  onPickWinner={onPickWinner}
                  picks={picks}
                  firstFourWinners={firstFourWinners}
                />
              </div>
            ))}
          </div>

          {/* Final Four */}
          <div className="w-1/2 mx-auto border-2 border-gray-600 rounded-lg p-4 bg-gray-300/50">
            <h2 className="text-xl font-bold text-black mb-3 text-center">Final Four</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              {/* Semifinal 1 */}
              <div className="bg-gray-200 rounded border border-gray-500 p-2">
                <div className="text-sm font-semibold text-gray-700 mb-2">Semifinal 1</div>
                {[0, 1].map((i) => {
                  const team = finalFourParticipants[0][i] as BracketTeam | undefined;
                  const winner = getValidFinalPick('semi', 0, finalFourParticipants[0]);

                  if (!team) {
                    return (
                      <button
                        key={`sf1-${i}`}
                        disabled
                        className="w-full relative overflow-hidden text-left text-sm px-2 rounded border bg-gray-300 text-gray-600 border-gray-400 opacity-90 cursor-not-allowed mb-1"
                        style={{ height: '30px' }}
                      >
                        <span className="flex items-center h-full">TBD</span>
                      </button>
                    );
                  }

                  const outcome: 'pending' | 'won' | 'lost' =
                    !winner ? 'pending' : winner.id === team.id ? 'won' : 'lost';
                  const { shellStyle, fillStyle } = getFirstFourSlotStyles(team, outcome);
                  const animClass = getFinalFourAnimClass('semi', 0, i);

                  return (
                    <button
                      key={`sf1-${i}`}
                      onClick={() => onPickFinalFourWinner('semi', 0, team.id)}
                      className="w-full relative overflow-hidden text-left text-sm rounded border cursor-pointer mb-1"
                      style={{ height: '30px', ...shellStyle }}
                    >
                      <div
                        className={`absolute inset-0 flex items-center gap-2 px-2 ${animClass} ${outcome === 'lost' ? 'opacity-80' : 'opacity-100'}`}
                        style={fillStyle}
                      >
                        <span className="w-5 shrink-0 text-right font-bold drop-shadow-sm tabular-nums">
                          {team.seed}
                        </span>
                        <img src={team.alternateLogoURL} alt={team.name} className="w-5 h-5 shrink-0" />
                        <AutoTeamName
                          displayName={team.displayName}
                          abbreviation={team.abbreviation}
                          className="drop-shadow-sm"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Championship */}
              <div>
                <div className="bg-gray-200 rounded border border-gray-500 p-2">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Championship</div>
                  {[0, 1].map((i) => {
                    const team = titleParticipants[i] as BracketTeam | undefined;
                    const winner = getValidFinalPick('title', 0, titleParticipants);

                    if (!team) {
                      return (
                        <button
                          key={`title-${i}`}
                          disabled
                          className="w-full relative overflow-hidden text-left text-sm px-2 rounded border bg-gray-300 text-gray-600 border-gray-400 opacity-90 cursor-not-allowed mb-1"
                          style={{ height: '30px' }}
                        >
                          <span className="flex items-center h-full">TBD</span>
                        </button>
                      );
                    }

                    const outcome: 'pending' | 'won' | 'lost' =
                      !winner ? 'pending' : winner.id === team.id ? 'won' : 'lost';
                    const { shellStyle, fillStyle } = getFirstFourSlotStyles(team, outcome);
                    const animClass = getFinalFourAnimClass('title', 0, i);

                    return (
                      <button
                        key={`title-${i}`}
                        onClick={() => onPickFinalFourWinner('title', 0, team.id)}
                        className="w-full relative overflow-hidden text-left text-sm rounded border cursor-pointer mb-1"
                        style={{ height: '30px', ...shellStyle }}
                      >
                        <div
                          className={`absolute inset-0 flex items-center gap-2 px-2 ${animClass} ${outcome === 'lost' ? 'opacity-80' : 'opacity-100'}`}
                          style={fillStyle}
                        >
                          <span className="w-5 shrink-0 text-right font-bold drop-shadow-sm tabular-nums">
                            {team.seed}
                          </span>
                          <img src={team.alternateLogoURL} alt={team.name} className="w-5 h-5 shrink-0" />
                          <AutoTeamName
                            displayName={team.displayName}
                            abbreviation={team.abbreviation}
                            className="drop-shadow-sm"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Semifinal 2 */}
              <div className="bg-gray-200 rounded border border-gray-500 p-2">
                <div className="text-sm font-semibold text-gray-700 mb-2">Semifinal 2</div>
                {[0, 1].map((i) => {
                  const team = finalFourParticipants[1][i] as BracketTeam | undefined;
                  const winner = getValidFinalPick('semi', 1, finalFourParticipants[1]);

                  if (!team) {
                    return (
                      <button
                        key={`sf2-${i}`}
                        disabled
                        className="w-full relative overflow-hidden text-left text-sm px-2 rounded border bg-gray-300 text-gray-600 border-gray-400 opacity-90 cursor-not-allowed mb-1"
                        style={{ height: '30px' }}
                      >
                        <span className="flex items-center h-full">TBD</span>
                      </button>
                    );
                  }

                  const outcome: 'pending' | 'won' | 'lost' =
                    !winner ? 'pending' : winner.id === team.id ? 'won' : 'lost';
                  const { shellStyle, fillStyle } = getFirstFourSlotStyles(team, outcome);
                  const animClass = getFinalFourAnimClass('semi', 1, i);
                  
                  return (
                    <button
                      key={`sf2-${i}`}
                      onClick={() => onPickFinalFourWinner('semi', 1, team.id)}
                      className="w-full relative overflow-hidden text-left text-sm rounded border cursor-pointer mb-1"
                      style={{ height: '30px', ...shellStyle }}
                    >
                      <div
                        className={`absolute inset-0 flex items-center gap-2 px-2 ${animClass} ${outcome === 'lost' ? 'opacity-80' : 'opacity-100'}`}
                        style={fillStyle}
                      >
                        <span className="w-5 shrink-0 text-right font-bold drop-shadow-sm tabular-nums">
                          {team.seed}
                        </span>
                        <img src={team.alternateLogoURL} alt={team.name} className="w-5 h-5 shrink-0" />
                        <AutoTeamName
                          displayName={team.displayName}
                          abbreviation={team.abbreviation}
                          className="drop-shadow-sm"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Champion display */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3">
                <div className="lg:block" />
                <div className="bg-gray-200 rounded border-2 border-gray-500 p-4 h-27.5 flex items-center justify-center">
                {(() => {
                    const champion = getValidFinalPick('title', 0, titleParticipants);
                    if (!champion) {
                    return <span className="text-gray-600 font-semibold"></span>;
                    }

                    return (
                    <div className="flex items-center gap-3">
                        <img
                        src={champion.logoURL}
                        alt={champion.name}
                        className="w-10 h-10 shrink-0"
                        />
                        <div className="text-center">
                        <div className="text-xs uppercase tracking-wide text-gray-600">Champion</div>
                        <div className="text-lg font-bold text-black">{champion.displayName}</div>
                        </div>
                    </div>
                    );
                })()}
                </div>
                <div className="lg:block" />
  </div>
          </div>

          {/* Bottom regions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {orderedRegionsForGrid.slice(2, 4).map((regionName, idx) => (
              <div key={regionName} className="text-left">
                <RegionBracket
                  regionName={regionName}
                  flipped={isRightSideRegion(regionName, idx + 2)}
                  getRoundParticipants={getRoundParticipants}
                  getValidWinner={getValidWinner}
                  onPickWinner={onPickWinner}
                  picks={picks}
                  firstFourWinners={firstFourWinners}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}