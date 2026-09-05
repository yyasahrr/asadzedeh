import { Hero } from "@/components/home/Hero";
import { TrustStats } from "@/components/home/TrustStats";
import { PathStart } from "@/components/home/PathStart";
import { PopularCourses } from "@/components/home/PopularCourses";
import { InPersonPreview } from "@/components/home/InPersonPreview";
import { Roadmap } from "@/components/home/Roadmap";
import { MasterSpotlight } from "@/components/home/MasterSpotlight";
import { WorkshopGallery } from "@/components/home/WorkshopGallery";
import { StudentWorks } from "@/components/home/StudentWorks";
import { Testimonials } from "@/components/home/Testimonials";
import { BlogPreview } from "@/components/home/BlogPreview";
import { FinalCTA } from "@/components/home/FinalCTA";
import { InstagramEmbed } from "@/components/home/InstagramEmbed";
import { Reveal } from "@/components/Reveal";

export default function HomePage() {
  return (
    <>
      <Hero />
      <div className="pt-10">
        <Reveal>
          <TrustStats />
        </Reveal>
      </div>
      <Reveal>
        <PathStart />
      </Reveal>
      <Reveal>
        <PopularCourses />
      </Reveal>
      <Reveal>
        <InPersonPreview />
      </Reveal>
      <Reveal>
        <Roadmap />
      </Reveal>
      <Reveal>
        <MasterSpotlight />
      </Reveal>
      <Reveal>
        <WorkshopGallery />
      </Reveal>
      <Reveal>
        <StudentWorks />
      </Reveal>
      <Reveal>
        <Testimonials />
      </Reveal>
      <Reveal>
        <BlogPreview />
      </Reveal>
      <Reveal>
        <FinalCTA />
      </Reveal>
      <Reveal>
        <InstagramEmbed />
      </Reveal>
    </>
  );
}
