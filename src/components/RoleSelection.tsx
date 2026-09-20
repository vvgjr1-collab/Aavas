import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { Home, Building2, ArrowRight, ArrowLeft, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import logoImage from '../assets/9916df943b90f5078a96ced9635c98fd96bc1655.png';

interface RoleSelectionProps {
  userName: string;
  onRoleSelect: (role: 'tenant' | 'landlord') => void;
  onBack: () => void;
}

interface RoleOption {
  id: 'tenant' | 'landlord';
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
  /** The colour this role is known by throughout the app. */
  accent: string;
  accentDark: string;
  titleClass: string;
  bullet: string;
  points: string[];
}

/** The two roles, described once, for every size of screen. */
const ROLES: RoleOption[] = [
  {
    id: 'tenant',
    title: "I'm a tenant",
    description: 'Manage your dream rental home',
    cta: 'Continue as Tenant',
    icon: Home,
    accent: '#2c7a7b',
    accentDark: '#234e52',
    titleClass: 'text-[#2C7A7B] dark:text-[#3D9B9D]',
    bullet: 'var(--tenant-primary)',
    points: [
      'Communicate with your landlord',
      'Register complaints',
      'Pay rent on time',
      'Book services in an instant',
    ],
  },
  {
    id: 'landlord',
    title: 'I want to manage my properties',
    description: 'Manage your rental properties',
    cta: 'Continue as Landlord',
    icon: Building2,
    accent: '#2e3a8c',
    accentDark: '#1f2861',
    titleClass: 'text-[#2e3a8c] dark:text-[#4a5bb0]',
    bullet: 'var(--landlord-accent)',
    points: [
      'Address complaints',
      'Manage rent',
      'Manage utilities',
      'Keep track of your properties wellbeing',
    ],
  },
];

/** How far a drag has to travel before it counts as having chosen the next card. */
const SWIPE_DISTANCE = 60;
/** A flick counts even when it is short. */
const SWIPE_VELOCITY = 400;

function RoleCard({ role, onSelect }: { role: RoleOption; onSelect: () => void }) {
  const Icon = role.icon;
  return (
    // The card keeps the plain surface rather than the translucent wash it
    // used to carry: the page behind it is now the role's own colour at full
    // strength, and letting that through turns the body text to mush.
    <Card className="h-full border border-transparent shadow-[var(--shadow-lg)]">
      <CardHeader className="text-center pb-6">
        <motion.div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: role.accent }}
          whileHover={{ rotate: role.id === 'tenant' ? 10 : -10 }}
        >
          <Icon className="w-10 h-10 text-white" />
        </motion.div>
        <CardTitle className={`text-2xl ${role.titleClass}`}>{role.title}</CardTitle>
        <CardDescription className="text-lg">{role.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ul className="space-y-3 text-sm text-muted-foreground">
          {role.points.map(point => (
            <li key={point} className="flex items-center space-x-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: role.bullet }}
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>

        <div className="pt-4">
          <Button
            className="w-full text-white transition-all duration-300"
            style={{ backgroundColor: role.accent }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = role.accentDark)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = role.accent)}
            onClick={e => {
              e.stopPropagation();
              onSelect();
            }}
          >
            {role.cta}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Choosing a role: one card at a time, dragged between, with the whole screen
 * taking on the colour of whichever role is in front.
 *
 * The colour follows the pointer rather than snapping at the end. That is the
 * part that makes it feel like moving between two places instead of toggling a
 * setting: the screen is already half indigo when you are half way there, and
 * letting go from half way puts it back.
 *
 * The same deck runs at every width. What changes with room is how much of the
 * other card you can see: on a phone one card fills the screen, and on a wide
 * one the active card is centred with its neighbour peeking past the edge -
 * so a big screen still shows at a glance that there are two of these, which
 * is the one thing the old side-by-side layout did better.
 *
 * Dragging moves between the options; it never picks one. Choosing is still
 * the button on the card, and the arrow keys and the dots move the deck,
 * because a gesture cannot be the only way to do something - there is no way
 * to swipe with a keyboard and no way for a screen reader to announce one.
 */
function SwipeDeck({
  userName,
  onRoleSelect,
}: {
  userName: string;
  onRoleSelect: (role: 'tenant' | 'landlord') => void;
}) {
  const [index, setIndex] = useState(0);
  // How wide one card is, and how far the track must start in to centre it.
  // On a phone the card fills the frame and the offset is zero, which is the
  // same arithmetic doing nothing.
  const [step, setStep] = useState(0);
  const [offset, setOffset] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  const slide = useRef<HTMLDivElement>(null);

  /** Where the track sits when card `i` is the one in front. */
  const restFor = (i: number) => offset - i * step;

  // The track's translation in pixels. Drag writes to it directly, so the
  // cards follow the pointer.
  const x = useMotionValue(0);

  // 0 on tenant, 1 on landlord, fractional mid-drag. Its own value rather than
  // something derived inline, so the colour is recomputed when the deck is
  // measured or the index changes, not only when x moves.
  const position = useMotionValue(0);

  useEffect(() => {
    const measure = () => {
      const frameWidth = frame.current?.offsetWidth ?? 0;
      const slideWidth = slide.current?.offsetWidth ?? frameWidth;
      const nextOffset = Math.max(0, (frameWidth - slideWidth) / 2);
      setStep(slideWidth);
      setOffset(nextOffset);
      // Stay on the same card across a resize rather than drifting between.
      x.set(nextOffset - index * slideWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [index, x]);

  useEffect(() => {
    const update = () => {
      const s = step || 1;
      position.set(Math.min(1, Math.max(0, (offset - x.get()) / s)));
    };
    update();
    return x.on('change', update);
  }, [x, position, step, offset]);

  const wash = useTransform(position, [0, 1], [ROLES[0].accent, ROLES[1].accent]);

  const goTo = (next: number) => {
    const clamped = Math.min(ROLES.length - 1, Math.max(0, next));
    setIndex(clamped);
    animate(x, restFor(clamped), { type: 'spring', stiffness: 320, damping: 34 });
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const far = Math.abs(info.offset.x) > SWIPE_DISTANCE;
    const fast = Math.abs(info.velocity.x) > SWIPE_VELOCITY;
    if (!far && !fast) return goTo(index);
    return goTo(info.offset.x < 0 ? index + 1 : index - 1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(index - 1);
    }
  };

  const active = ROLES[index];

  return (
    <div>
      {/* The screen itself. Fixed, so it is the whole viewport rather than the
          column the cards sit in, and behind everything the page draws. */}
      <motion.div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{ backgroundColor: wash }}
      />

      <div className="text-center mb-6 md:mb-10">
        <div className="flex items-center justify-center gap-3 mb-5">
          {/* The mark is dark navy, which disappears into the landlord
              indigo. Knocked out to white it sits on either colour. */}
          <img src={logoImage} alt="Aavas" className="h-10 md:h-12 brightness-0 invert" />
          <span className="text-2xl md:text-3xl font-aavas text-white">Aavas</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-semibold text-white mb-2">
          Welcome, {userName}!
        </h1>
        <p className="text-white/80 md:text-lg">
          <span className="md:hidden">Swipe to choose how you'll use Aavas</span>
          <span className="hidden md:inline">
            Drag, or use the arrow keys, to choose how you'll use Aavas
          </span>
        </p>
      </div>

      <div
        ref={frame}
        role="group"
        aria-label="Choose how you'll use Aavas"
        tabIndex={0}
        onKeyDown={onKeyDown}
        // The mask only applies where there is a neighbour to see: it fades
        // the peeking card out at the edges instead of guillotining it. On a
        // phone the active card fills the frame and a fade would just dim its
        // own corners, so it starts at md.
        className="overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:[mask-image:linear-gradient(to_right,transparent_0%,black_8%,black_92%,transparent_100%)]"
      >
        <motion.div
          // py-2 so the cards' shadows have somewhere to fall; the frame
          // clips vertically as well as horizontally.
          className="flex py-2 touch-pan-y cursor-grab active:cursor-grabbing"
          drag="x"
          // Held to the two ends: past them the cards slide off into nothing,
          // which reads as the screen being broken rather than as having
          // reached the last option.
          dragConstraints={{ left: restFor(ROLES.length - 1), right: restFor(0) }}
          dragElastic={0.12}
          style={{ x }}
          onDragEnd={onDragEnd}
        >
          {ROLES.map((role, i) => (
            <div
              key={role.id}
              ref={i === 0 ? slide : undefined}
              // Full width on a phone; a fixed card on a wide screen, which is
              // what leaves room for the neighbour to show at the edge.
              className="w-full md:w-[26rem] shrink-0 px-1 md:px-3"
            >
              <RoleCard role={role} onSelect={() => onRoleSelect(role.id)} />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Reachable without a gesture, and the only part of this a screen
          reader can use. */}
      <div className="mt-6 flex items-center justify-center gap-3">
        {ROLES.map((role, i) => (
          <button
            key={role.id}
            type="button"
            aria-label={`Show the ${role.id} option`}
            aria-current={i === index}
            onClick={() => goTo(i)}
            className="p-2"
          >
            <span
              className={`block rounded-full transition-all duration-300 ${
                i === index ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'
              }`}
            />
          </button>
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {active.title}, option {index + 1} of {ROLES.length}
      </p>

      <p className="text-center text-sm text-white/75 mt-6">
        You can always switch between roles in your account settings
      </p>
    </div>
  );
}

export function RoleSelection({ userName, onRoleSelect, onBack }: RoleSelectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto"
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mb-6"
      >
        <Button
          aria-label="Go back"
          variant="ghost"
          onClick={onBack}
          // The screen behind it is the role's colour at every width now.
          className="p-2 rounded-full text-white hover:bg-white/15"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </motion.div>

      <SwipeDeck userName={userName} onRoleSelect={onRoleSelect} />
    </motion.div>
  );
}
