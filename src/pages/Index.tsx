import { GrainOverlay } from "@/components/GrainOverlay";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { Tjenester } from "@/components/sections/Tjenester";
import { VVSAI } from "@/components/sections/VVSAI";
import { Hvordan } from "@/components/sections/Hvordan";
import { OmOss } from "@/components/sections/OmOss";
import { Kontakt } from "@/components/sections/Kontakt";
import { Footer } from "@/components/sections/Footer";

const Index = () => (
  <main className="relative">
    <GrainOverlay />
    <Nav />
    <Hero />
    <Problem />
    <Tjenester />
    <VVSAI />
    <Hvordan />
    <OmOss />
    <Kontakt />
    <Footer />
  </main>
);

export default Index;
