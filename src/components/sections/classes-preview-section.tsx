import Link from "next/link";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Users, ArrowRight } from "lucide-react";
import type { Class } from "@/lib/firebase/types";

interface ClassesPreviewSectionProps {
  classes: Class[];
}

export function ClassesPreviewSection({ classes }: ClassesPreviewSectionProps) {
  if (classes.length === 0) return null;

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <SectionHeader
          subtitle="Our Programs"
          title="Islamic Classes"
          description="Enrich your knowledge with our structured Islamic education programs taught by qualified instructors."
          align="center"
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {classes.slice(0, 4).map((classItem) => (
            <Card key={classItem.id} className="group text-center">
              {/* Icon */}
              <div className="pt-8">
                <div className="w-20 h-20 mx-auto bg-[var(--primary)]/10 rounded-full flex items-center justify-center group-hover:bg-[var(--primary)] transition-colors">
                  <BookOpen className="w-10 h-10 text-[var(--primary)] group-hover:text-white transition-colors" />
                </div>
              </div>

              <CardContent className="p-6">
                <h3 className="font-heading text-lg font-bold text-[var(--dark)] mb-2">
                  {classItem.title}
                </h3>
                <p className="text-[var(--gray)] text-sm mb-4 line-clamp-2">
                  {classItem.description}
                </p>

                <div className="space-y-2 text-sm text-[var(--gray)] mb-4">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--secondary)]" />
                    <span>{classItem.time || classItem.schedule}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Users className="w-4 h-4 text-[var(--secondary)]" />
                    <span>{classItem.students_enrolled || 0} Students</span>
                  </div>
                </div>

                <Link
                  href={`/classes/${classItem.slug || classItem.id}`}
                  className="inline-flex items-center gap-2 text-[var(--primary)] font-semibold text-sm hover:gap-3 transition-all"
                >
                  Enroll Now
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/classes">
            <Button variant="secondary" size="lg">
              View All Classes
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
