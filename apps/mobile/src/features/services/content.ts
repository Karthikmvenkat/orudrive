/**
 * Copy and rates for the roadside services, mirrored from the shipped website
 * pages so the app and the site quote the same numbers.
 */

export type ServiceSlug = 'puncture' | 'tow' | 'driver';

export type ServiceIcon =
  | 'build'
  | 'speedometer'
  | 'bicycle'
  | 'location'
  | 'time'
  | 'wallet'
  | 'construct'
  | 'shield-checkmark'
  | 'ribbon'
  | 'language'
  | 'map'
  | 'cafe'
  | 'car'
  | 'checkmark-circle';

export type ServiceHighlight = { icon: ServiceIcon; title: string; detail: string };

export type ServiceRate = { label: string; note: string; price: number };

export type ServicePlan = {
  name: string;
  price: number;
  unit: string;
  minimum: string;
  perks: string[];
  popular?: boolean;
};

export type ServicePage = {
  slug: ServiceSlug;
  name: string;
  eyebrow: string;
  headline: string;
  intro: string;
  highlights?: ServiceHighlight[];
  plans?: ServicePlan[];
  rates?: { title: string; rows: ServiceRate[] };
  included?: { icon: ServiceIcon; label: string }[];
  steps: { title: string; detail: string }[];
  faqs?: { question: string; answer: string }[];
  note?: string;
  callLabel: string;
  whatsappText: string;
};

export const SERVICE_PAGES: Record<ServiceSlug, ServicePage> = {
  puncture: {
    slug: 'puncture',
    name: 'Puncture service',
    eyebrow: 'Mobile puncher',
    headline: 'Flat tyre?\nWe come to you.',
    intro:
      'On-the-spot puncture repair for bikes, scooters and cars anywhere in Puducherry. One call sends a technician with a portable compressor and repair kit to your location.',
    highlights: [
      {
        icon: 'build',
        title: 'Repair at your spot',
        detail: 'No need to push the vehicle to a garage — the technician comes to you.',
      },
      {
        icon: 'speedometer',
        title: 'Portable compressor',
        detail: 'Tubeless punctures are plugged and inflated on location.',
      },
      {
        icon: 'bicycle',
        title: 'Bikes and cars',
        detail: 'Scooters, motorcycles, hatchbacks, sedans and SUVs are all covered.',
      },
      {
        icon: 'location',
        title: 'Across Puducherry',
        detail: 'White Town, Auroville, Lawspet, Villianur and nearby areas.',
      },
    ],
    steps: [
      {
        title: 'Call or WhatsApp support',
        detail: 'Tell us the vehicle, the tyre and your live location.',
      },
      {
        title: 'We confirm the technician',
        detail:
          "You get the technician's details and the confirmed charge before anyone rides out.",
      },
      {
        title: 'Repair and ride on',
        detail:
          'The puncture is repaired on the spot and the tyre is inflated to the correct pressure.',
      },
    ],
    note:
      'The same crew that runs our tow service handles puncher calls, so you deal with one support line for both.',
    callLabel: 'Request a puncher',
    whatsappText: 'Hi SavariGo, I need a puncture repair. My vehicle and location are:',
  },
  tow: {
    slug: 'tow',
    name: 'Tow vehicle',
    eyebrow: '24×7 roadside support',
    headline: "Stranded?\nWe'll tow you home.",
    intro:
      '24×7 breakdown towing for bikes, scooters and cars anywhere in Puducherry. Flat rates, trained crews and your vehicle tracked from pickup to drop.',
    highlights: [
      {
        icon: 'time',
        title: '24×7 dispatch',
        detail: 'Crews on rotation across Puducherry, average arrival under 30 minutes.',
      },
      {
        icon: 'wallet',
        title: 'Flat upfront rates',
        detail: 'The quote you approve before we roll is the price you pay at drop.',
      },
      {
        icon: 'construct',
        title: 'Damage-free loading',
        detail: 'Hydraulic ramps, wheel straps and blankets for bikes and cars alike.',
      },
      {
        icon: 'shield-checkmark',
        title: 'Insured while towing',
        detail: 'Your vehicle is covered by our transit insurance from pickup to drop.',
      },
    ],
    rates: {
      title: 'In-city tow rates',
      rows: [
        { label: 'Scooter / Moped', note: 'Activa, Jupiter, Access and similar', price: 299 },
        { label: 'Motorcycle', note: 'Classic, Bullet, RC and similar', price: 349 },
        { label: 'Car — hatchback & sedan', note: 'i20, City, Nexon and similar', price: 499 },
        { label: 'Car — SUV & MUV', note: 'Ertiga, Creta and similar', price: 599 },
      ],
    },
    steps: [
      {
        title: 'Call or WhatsApp us',
        detail:
          'Tell us what happened — breakdown, puncture, accident or battery. Share your live location.',
      },
      {
        title: 'Approve the quote',
        detail: 'We confirm the flat rate and crew details on WhatsApp before anyone rolls out.',
      },
      {
        title: 'We load and go',
        detail: 'The crew secures your vehicle on the flatbed and shares live tracking with you.',
      },
      {
        title: 'Pay after drop',
        detail: 'UPI, card or cash — pay only after your vehicle reaches the garage or your doorstep.',
      },
    ],
    faqs: [
      {
        question: 'How fast does a tow truck reach me?',
        answer:
          "Inside Puducherry city limits our average arrival is under 30 minutes, day or night. Outskirts like Auroville or Villianur usually take 40–50 minutes. You'll get an ETA on WhatsApp as soon as the crew is assigned.",
      },
      {
        question: 'Which areas do you cover?',
        answer:
          'All of Puducherry — White Town, Lawspet, Villianur, Gorimedu, Mudaliarpet, Kottakuppam and Auroville. Outstation tows toward Chennai, Cuddalore or Chidambaram are charged per kilometre.',
      },
      {
        question: 'Can I ride along with my vehicle?',
        answer:
          'Yes, one person can ride in the tow cab on in-city tows at no extra charge. For outstation tows a small return-fuel fee applies for the second seat.',
      },
      {
        question: 'What if my vehicle was in an accident?',
        answer:
          "Choose 'Accident recovery' when you call. We coordinate with your insurer, photograph the vehicle before loading and tow directly to a partner garage or the workshop you choose.",
      },
      {
        question: "Do you tow vehicles that won't start at all?",
        answer:
          'Yes. Dead battery, seized engine, flooded streets or a locked wheel — the hydraulic flatbed loads non-running vehicles without dragging them.',
      },
    ],
    note:
      'Rates include loading, unloading and 30 minutes of waiting time. Night dispatch (11 pm – 6 am) carries a ₹100 surcharge, outstation tows are billed at ₹18 per km beyond the first 15 km, and accident recovery documentation is free.',
    callLabel: 'Request a tow',
    whatsappText: 'Hi SavariGo, I need a tow. My vehicle and location are:',
  },
  driver: {
    slug: 'driver',
    name: 'Driver on demand',
    eyebrow: 'Professional drivers',
    headline: "You enjoy the view.\nWe'll handle the road.",
    intro:
      'Hire a professional driver in Puducherry by the hour, day or for outstation trips. Use your own car or pair a driver with one of ours.',
    plans: [
      {
        name: 'Hourly',
        price: 299,
        unit: 'hour',
        minimum: 'Minimum 4 hours',
        perks: ['Within Puducherry city', 'Up to 40 km included', 'Fuel by customer'],
      },
      {
        name: 'Full Day',
        price: 1499,
        unit: 'day',
        minimum: 'Up to 10 hours',
        perks: ['Up to 150 km included', 'Night allowance included', 'Fuel by customer'],
        popular: true,
      },
      {
        name: 'Outstation',
        price: 2499,
        unit: 'day',
        minimum: 'Minimum 2 days',
        perks: [
          'Unlimited kilometres',
          'Driver stay allowance included',
          'Interstate permits handled',
        ],
      },
    ],
    included: [
      { icon: 'ribbon', label: 'Licence & background verified' },
      { icon: 'language', label: 'English, Tamil, Hindi & French' },
      { icon: 'map', label: 'Knows ECR, Auroville & French Quarter' },
      { icon: 'cafe', label: 'Meal and rest breaks covered' },
      { icon: 'shield-checkmark', label: 'Insured on every assignment' },
      { icon: 'car', label: 'Fuel at actuals — no markup' },
    ],
    steps: [
      {
        title: 'Pick a plan',
        detail: 'Hourly for errands, full day for sightseeing, outstation for longer road trips.',
      },
      {
        title: 'Share your itinerary',
        detail:
          "Tell us pickup time, stops and whether you're driving your own car or renting ours.",
      },
      {
        title: 'Meet your driver',
        detail:
          'We assign a vetted local driver with a photo ID, at least 12 hours before pickup.',
      },
    ],
    note:
      'Driver charges exclude fuel, tolls and parking. Outstation trips include a ₹500 daily driver allowance already baked into the price.',
    callLabel: 'Request a driver',
    whatsappText: 'Hi SavariGo, I would like to book a driver. My itinerary is:',
  },
};
