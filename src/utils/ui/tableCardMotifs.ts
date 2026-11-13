// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Icon } from '@phosphor-icons/react';
import {
  AcornIcon,
  AirplaneIcon,
  AlienIcon,
  AnchorIcon,
  AvocadoIcon,
  BalloonIcon,
  BicycleIcon,
  BirdIcon,
  BoatIcon,
  BugIcon,
  BusIcon,
  ButterflyIcon,
  CactusIcon,
  CarIcon,
  CarrotIcon,
  CatIcon,
  CherriesIcon,
  CloudIcon,
  CookieIcon,
  CowIcon,
  DogIcon,
  FishIcon,
  FlowerIcon,
  FlowerTulipIcon,
  FlyingSaucerIcon,
  GhostIcon,
  GiftIcon,
  GuitarIcon,
  HamburgerIcon,
  HeartIcon,
  HorseIcon,
  IceCreamIcon,
  LeafIcon,
  MoonIcon,
  OrangeIcon,
  PaintBrushIcon,
  PawPrintIcon,
  PizzaIcon,
  PlanetIcon,
  PopcornIcon,
  PuzzlePieceIcon,
  RabbitIcon,
  RainbowIcon,
  RobotIcon,
  RocketIcon,
  SailboatIcon,
  ScooterIcon,
  SnowflakeIcon,
  SoccerBallIcon,
  StarIcon,
  SunIcon,
  TentIcon,
  TractorIcon,
  TrainIcon,
  TreeIcon,
  TruckIcon,
  UmbrellaIcon,
} from '@phosphor-icons/react';
import type { CardMotifSet } from './tableCards';

/**
 * The motifs a table card may carry (decision 0047), in sets a teacher picks
 * between. Every one is a Phosphor icon: drawn in two tones on a card, as an
 * outline to colour in — weights the build keeps for these icons alone, so a
 * new one goes into `MOTIF_ICON_NAMES` too (`scripts/utils/iconWeights.ts`).
 */
const ANIMALS: readonly Icon[] = [
  CatIcon,
  DogIcon,
  BirdIcon,
  ButterflyIcon,
  FishIcon,
  HorseIcon,
  RabbitIcon,
  CowIcon,
  BugIcon,
  PawPrintIcon,
];

const VEHICLES: readonly Icon[] = [
  RocketIcon,
  BicycleIcon,
  CarIcon,
  AirplaneIcon,
  BoatIcon,
  TrainIcon,
  BusIcon,
  TractorIcon,
  SailboatIcon,
  ScooterIcon,
  TruckIcon,
  FlyingSaucerIcon,
];

const NATURE: readonly Icon[] = [
  FlowerIcon,
  FlowerTulipIcon,
  TreeIcon,
  LeafIcon,
  AcornIcon,
  CactusIcon,
  SunIcon,
  MoonIcon,
  StarIcon,
  CloudIcon,
  RainbowIcon,
  SnowflakeIcon,
  UmbrellaIcon,
  PlanetIcon,
];

const FOOD: readonly Icon[] = [
  IceCreamIcon,
  PizzaIcon,
  CookieIcon,
  CherriesIcon,
  CarrotIcon,
  OrangeIcon,
  AvocadoIcon,
  PopcornIcon,
  HamburgerIcon,
];

const THINGS: readonly Icon[] = [
  BalloonIcon,
  GhostIcon,
  AlienIcon,
  RobotIcon,
  SoccerBallIcon,
  TentIcon,
  GuitarIcon,
  PaintBrushIcon,
  AnchorIcon,
  PuzzlePieceIcon,
  GiftIcon,
  HeartIcon,
];

const SETS: Record<Exclude<CardMotifSet, 'own' | 'none'>, readonly Icon[]> = {
  animals: ANIMALS,
  vehicles: VEHICLES,
  nature: NATURE,
  food: FOOD,
  all: [...ANIMALS, ...VEHICLES, ...NATURE, ...FOOD, ...THINGS],
};

/** Every motif, for the build that keeps their weights (`iconWeights`). */
export const CARD_MOTIF_ICONS: readonly Icon[] = SETS.all;

/**
 * The motifs of a set, in the order a child's slot picks from them
 * (`spreadSlots`); none for the own picture and none.
 */
export function cardMotifs(set: CardMotifSet): readonly Icon[] {
  return set === 'own' || set === 'none' ? [] : SETS[set];
}

/** The first motif of a set, for the row that offers it. */
export function cardMotifPreview(set: CardMotifSet): Icon | null {
  return cardMotifs(set)[0] ?? null;
}
