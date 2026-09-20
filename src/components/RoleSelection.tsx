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
  cardClass: string;
  bullet: string;
  points: string[];
}

/**
 * The two roles, described once.
 *
 * The cards used to be written out twice, which is how the phone layout and
 * the desktop one would drift apart the first time either was edited. Both
 * now render from here.
 */
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
    cardClass:
      'hover:border-[#2C7A7B]/40 bg-gradient-to-br from-[#FFFBDE]/30 to-[#f4eedf]/50 dark:from-[#2C7A7B]/20 dark:to-[#2C7A7B]/10',
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
    cardClass:
      'hover:border-[#2e3a8c]/40 bg-gradient-to-br from-[#f4eedf]/30 to-[#f4eedf]/50 dark:from-[#2e3a8c]/20 dark:to-[#2e3a8c]/10',
    bullet: 'var(--landlord-accent)',
    points: [
      'Address complaints',
      'Manage rent',
      'Manage utilities',
      "Keep track of your properties wellbeing",
    ],
  },
];

/** How far a drag has to travel before it counts as having chosen the next card. */
const SWIPE_DISTANCE = 60;
/** A flick counts even when it is short. */
const SWIPE_VELOCITY = 400;

function RoleCard({
  role,
  onSelect,
  hoverable,
  solid = false,
}: {
  role: RoleOption;
  onSelect: () => void;
  hoverable: boolean;
  /**
   * Drop the translucent wash the card normally carries.
   *
   * That gradient is tuned for a pale page behind it. On the phone the page
   * behind it is the role's own colour at full strength, and letting it
   * through turns the muted body text into low-contrast mush - so the deck
   * gets the plain card surface instead.
   */
  solid?: boolean;
}) {
  const Icon = role.icon;
  return (
    <Card
      className={`h-full border border-transparent transition-all duration-300 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] ${
        solid ? '' : role.cardClass
      }`}
    >
      <CardHeader className="text-center pb-6">
        <motion.div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300"
          style={{ backgroundColor: role.accent }}
          whileHover={hoverable ? { rotate: role.id === 'tenant' ? 10 : -10 } : undefined}
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
 * The phone layout: one card at a time, swiped between, with the whole screen
 * taking on the colour of whichever role is in front.
 *
 * Two cards side by side is a desktop shape - on a phone they stack, and the
 * second one is below the fold, so the choice reads as "tenant, and something
 * else underneath". Here the choice is the whole screen, and moving between
 * the two is a thing you do with your thumb.
 *
 * The colour follows the finger rather than snapping at the end. That is the
 * part that makes it feel like moving between two places instead of toggling
 * a setting: the screen is already half indigo when you are half way there,
 * and letting go from half way puts it back.
 *
 * Swiping moves between the options; it never picks one. Choosing is still
 * the button on the card, because a gesture cannot be the only way to do
 * something - there is no way to swipe with a keyboard, and no way for a
 * screen reader to announce one.
 */
function SwipeDeck({
  userName,
  onRoleSelect,
}: {
  userName: string;
  onRoleSelect: (role: 'tenant' | 'landlord') => void;
}) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const frame = useRef<HTMLDivElement>(null);

  // The track's horizontal offset in pixels: 0 on the first card, -width on
  // the second. Drag writes to it directly, so the cards track the finger.
  const x = useMotionValue(0);

  // 0 on tenant, 1 on landlord, fractional while a drag is in flight. Kept as
  // its own value rather than derived inline so the colour is recomputed when
  // the width is measured or the index changes, not only when x moves.
  const position = useMotionValue(0);

  useEffect(() => {
    const measure = () => {
      const next = frame.current?.offsetWidth ?? 0;
      setWidth(next);
      // Stay on the same card across a rotation rather than drifting between.
      x.set(-index * next);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [index, x]);

  useEffect(() => {
    const update = () => {
      const w = width || 1;
      position.set(Math.min(1, Math.max(0, -x.get() / w)));
    };
    update();
    return x.on('change', update);
  }, [x, position, width]);

  const wash = useTransform(position, [0, 1], [ROLES[0].accent, ROLES[1].accent]);

  const goTo = (next: number) => {
    const clamped = Math.min(ROLES.length - 1, Math.max(0, next));
    setIndex(clamped);
    animate(x, -clamped * width, { type: 'spring', stiffness: 320, damping: 34 });
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const far = Math.abs(info.offset.x) > SWIPE_DISTANCE;
    const fast = Math.abs(info.velocity.x) > SWIPE_VELOCITY;
    if (!far && !fast) return goTo(index);
    return goTo(info.offset.x < 0 ? index + 1 : index - 1);
  };

  const active = ROLES[index];

  return (
    <div className="md:hidden">
      {/* The screen itself. Fixed, so it is the whole viewport rather than the
          column the cards sit in, and behind everything the page draws. */}
      <motion.div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{ backgroundColor: wash }}
      />

      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-5">
          {/* The mark is dark navy, which disappears into the landlord
              indigo. Knocked out to white it sits on either colour. */}
          <img src={logoImage} alt="Aavas" className="h-10 brightness-0 invert" />
          <span className="text-2xl font-aavas text-white">Aavas</span>
        </div>
        <h1 className="text-2xl font-semibold text-white mb-2">Welcome, {userName}!</h1>
        <p className="text-white/80">Swipe to choose how you'll use Aavas</p>
      </div>

      <div ref={frame} className="overflow-hidden">
        <motion.div
          className="flex touch-pan-y"
          drag="x"
          // Held to the two ends: past them the cards would slide off into
          // nothing, which reads as the screen being broken rather than as
          // having reached the last option.
          dragConstraints={{ left: -(ROLES.length - 1) * width, right: 0 }}
          dragElastic={0.12}
          style={{ x }}
          onDragEnd={onDragEnd}
        >
          {ROLES.map(role => (
            <div key={role.id} className="w-full shrink-0 px-1">
              <RoleCard
                role={role}
                hoverable={false}
                solid
                onSelect={() => onRoleSelect(role.id)}
              />
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
          // White on the phone, where it sits on the role's colour; the
          // ordinary muted arrow on desktop, where it sits on the page.
          className="p-2 rounded-full text-white hover:bg-white/15 md:text-muted-foreground md:hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </motion.div>

      <SwipeDeck userName={userName} onRoleSelect={onRoleSelect} />

      {/* Desktop keeps both options in view at once, which is the right shape
          when there is room for them. */}
      <div className="hidden md:block">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <img src={logoImage} alt="Aavas" className="h-12" />
            <span className="text-3xl font-aavas">Aavas</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-3xl font-semibold mb-3"
          >
            Welcome, {userName}!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-lg text-muted-foreground"
          >
            Choose how you'd like to use our platform
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {ROLES.map((role, i) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="group cursor-pointer"
              onClick={() => onRoleSelect(role.id)}
            >
              <RoleCard role={role} hoverable onSelect={() => onRoleSelect(role.id)} />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-muted-foreground">
            Don't worry, you can always switch between roles in your account settings
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
