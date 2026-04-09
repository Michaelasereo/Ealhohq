import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const configs = [
    {
      key: "hero_cta_secondary_text",
      value: "Get a free burnout guide",
    },
    {
      key: "burnout_landing_button_text",
      value: "",
    },
    {
      key: "burnout_modal_title",
      value: "Get your free burnout guide",
    },
    {
      key: "burnout_modal_subtitle",
      value:
        "Enter your name and email — we’ll send you the PDF by email right away.",
    },
    {
      key: "burnout_modal_success_message",
      value:
        "You’re all set. Check your inbox for the PDF (and your spam folder if you don’t see it).",
    },
  ];

  for (const config of configs) {
    await prisma.siteConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }
  console.log("✅ Site config seeded");

  const reviews = [
    {
      authorName: "Seed — sample A",
      authorRole: "Cardiologist",
      authorLocation: "Lagos",
      content:
        "As a doctor, I was sceptical about online therapy. But Ealho genuinely understood the pressure of clinical life. My therapist got it immediately — no explaining needed. I have recommended it to three colleagues already.",
      rating: 5,
      isAnonymous: true,
      isApproved: true,
      isPublished: true,
      isFeatured: true,
      source: "manual",
    },
    {
      authorName: "Seed — sample B",
      authorRole: "Registered nurse",
      authorLocation: "FCT Abuja",
      content:
        "I had been putting off therapy for two years because I did not know how to find someone who understood healthcare. Ealho matched me with exactly the right person. The anonymous option made me feel safe enough to actually start.",
      rating: 5,
      isAnonymous: true,
      isApproved: true,
      isPublished: true,
      isFeatured: true,
      source: "manual",
    },
    {
      authorName: "Seed — sample C",
      authorRole: "Resident doctor",
      authorLocation: "Ibadan",
      content:
        "Residency is brutal. I used to think burnout was just tiredness. My therapist helped me understand what was actually happening and gave me tools I use every single day. The session notes my therapist keeps mean we never lose progress.",
      rating: 5,
      isAnonymous: true,
      isApproved: true,
      isPublished: true,
      isFeatured: true,
      source: "manual",
    },
    {
      authorName: "Seed — sample D",
      authorRole: "Pharmacist",
      authorLocation: "Lagos",
      content:
        "I booked my first session completely anonymously and it changed everything. Being able to be honest without worrying who might find out was exactly what I needed to start the work.",
      rating: 5,
      isAnonymous: true,
      isApproved: true,
      isPublished: true,
      isFeatured: false,
      source: "manual",
    },
    {
      authorName: "Seed — sample E",
      authorRole: "Paediatrician",
      authorLocation: "Port Harcourt",
      content:
        "The AI session notes surprised me — my therapist arrives at every session already knowing where we left off. It feels like real continuity of care, not starting over each time.",
      rating: 5,
      isAnonymous: true,
      isApproved: true,
      isPublished: true,
      isFeatured: false,
      source: "manual",
    },
  ];

  if ((await prisma.review.count()) === 0) {
    for (const review of reviews) {
      await prisma.review.create({ data: review });
    }
    console.log("✅ Sample reviews seeded");
  } else {
    console.log("⏭️  Skipped reviews seed (reviews already exist)");
  }

  const posts = [
    {
      title:
        "Why Nigerian Doctors Are Burning Out — And What Nobody Is Saying About It",
      slug: "nigerian-doctors-burnout",
      excerpt:
        "Burnout among Nigerian healthcare workers has reached a quiet crisis point. We explore the systemic causes, the cultural silence around it, and what can actually be done.",
      content: `## The Crisis Nobody Talks About

Healthcare workers in Nigeria are burning out at rates that should alarm everyone. Yet the conversation remains muted — partly because of stigma, partly because the system provides no space for it, and partly because doctors and nurses are trained to absorb.

This is that conversation.

## What Burnout Actually Is

The World Health Organisation defines burnout as a syndrome resulting from chronic workplace stress that has not been successfully managed. Three dimensions:

- **Emotional exhaustion** — feeling depleted, having nothing left to give
- **Depersonalisation** — becoming detached, cynical about patients
- **Reduced professional efficacy** — feeling like your work no longer matters

In Nigerian clinical settings, all three are endemic. The average teaching hospital doctor sees 40-60 patients daily. Sleep deprivation during residency is normalised. Emotional support is nonexistent.

## The Numbers

A 2022 study in a Lagos tertiary hospital found that 67% of resident doctors showed moderate to high burnout levels. Among nurses, the figure was higher. These are not outliers.

## Why It Goes Unaddressed

**Cultural silence.** Healthcare workers are trained to be the strong ones. Admitting distress feels like professional failure.

**System neglect.** There are no formal mental health support structures for healthcare staff in most Nigerian public hospitals.

**Stigma.** The same stigma patients face, doctors face internally. "If I cannot handle this, am I really cut out for medicine?"

## What Actually Helps

Evidence consistently shows that individual therapy — specifically CBT and acceptance-based approaches — reduces burnout symptoms in healthcare workers. The key factors:

- Therapist understanding of healthcare-specific stressors
- Confidentiality (critical for professionals)
- Accessibility — not requiring time off work to attend

This is precisely what Ealho was built to provide.

## The First Step

If you are reading this and recognising yourself in it — that recognition is the first step. Burnout is not a character flaw. It is the predictable result of impossible conditions.

You deserve support. And support is available.`,
      category: "Mental Health",
      tags: ["burnout", "doctors", "Nigeria", "mental health"],
      readingTime: 6,
      status: "published",
      featured: true,
      publishedAt: new Date(),
      metaTitle: "Why Nigerian Doctors Are Burning Out | Ealho Therapy",
      metaDesc:
        "Burnout among Nigerian healthcare workers has reached crisis levels. We explore the causes, the silence around it, and evidence-based solutions.",
    },
    {
      title:
        "The Truth About Starting Therapy as a Healthcare Professional in Nigeria",
      slug: "starting-therapy-healthcare-professional-nigeria",
      excerpt:
        "Starting therapy feels different when you know the clinical terms, when confidentiality feels complicated, and when your colleagues might be your therapist's other clients.",
      content: `## It Is Different When You Are a Healthcare Worker

Most therapy advice assumes the patient comes in as a blank slate. Healthcare professionals do not.

You know the DSM criteria. You can hear a formulation forming before it is said. You might know your therapist from a conference. You might worry your patient referred you to the same practice.

This is the honest guide to navigating all of that.

## The Confidentiality Question

The most common reason healthcare workers do not seek therapy is fear. Not of the process — of who will find out.

This fear is rational. Nigerian healthcare communities are small. Your cardiologist colleague might golf with your potential therapist's husband.

This is precisely why Ealho built the anonymous booking feature. You can begin therapy without your real name ever reaching your therapist. You choose an alias. They know you professionally, not personally. The work is the same.

## The "I Already Know This" Trap

Many healthcare workers sit in early sessions thinking "I know what they are doing" and "I have read about this technique." This is the most common block to progress.

Knowing about therapy intellectually is completely different from experiencing it. The insight that changes things does not come from knowing — it comes from feeling something new in a safe space.

Give yourself permission not to be the expert in this room.

## Finding the Right Therapist

Not all therapists understand clinical life. The specific stressors — night calls, patient deaths, the weight of decisions — require a therapist with genuine understanding, not just general empathy.

At Ealho, every therapist on the platform has been specifically selected for experience working with healthcare professionals. You will not spend your first session explaining what a ward round is.

## The First Session

You do not need to prepare. You do not need to know what to say. You do not need to have a specific problem ready.

Come as you are. That is enough.`,
      category: "Therapy",
      tags: ["therapy", "healthcare workers", "starting therapy", "Nigeria"],
      readingTime: 5,
      status: "published",
      featured: false,
      publishedAt: new Date(),
      metaTitle:
        "Starting Therapy as a Healthcare Professional in Nigeria | Ealho",
      metaDesc:
        "Starting therapy feels different when you are a healthcare professional. Here is an honest guide to navigating confidentiality, professional identity, and finding the right therapist.",
    },
    {
      title: "Burnout vs Depression: How to Tell the Difference",
      slug: "burnout-vs-depression-difference",
      excerpt:
        "They share symptoms. They feel similar. But burnout and depression are different — and the distinction matters for how you get better.",
      content: `## Why This Distinction Matters

Healthcare workers are particularly vulnerable to confusing burnout with depression — and particularly reluctant to apply the word "depression" to themselves.

Understanding the difference is not academic. It shapes treatment, prognosis, and — critically — what kind of help will actually work.

## The Overlap

Both burnout and depression involve:
- Persistent fatigue
- Loss of motivation
- Difficulty concentrating
- Withdrawal from others
- Reduced sense of achievement

This is why the two are so often conflated.

## The Differences

**Context specificity**
Burnout is context-specific. It happens because of work. On a holiday, symptoms may lift. Depression is pervasive — it follows you everywhere.

**Emotional quality**
Burnout typically presents with exhaustion and cynicism. Depression presents with emptiness, hopelessness, or a numbed absence of feeling.

**Physical manifestations**
Both cause fatigue, but burnout fatigue is often characterised by physical depletion. Depression frequently involves an inability to begin, rather than inability to continue.

**Response to rest**
Rest improves burnout meaningfully. It rarely resolves depression.

## Why Healthcare Workers Often Have Both

Chronic, untreated burnout is a significant risk factor for developing clinical depression. The two conditions exist on a continuum, and many healthcare workers who present thinking they are "just burnt out" are also experiencing a depressive episode.

This is not a failure. It is the predictable outcome of sustained overwhelm without support.

## What to Do

If you recognise yourself here — in either description, or both — the right next step is the same: speak to someone qualified to help you understand what you are experiencing.

A skilled therapist can help you distinguish what is happening and build a plan that addresses it appropriately.`,
      category: "Mental Health",
      tags: ["burnout", "depression", "mental health", "healthcare"],
      readingTime: 5,
      status: "published",
      featured: false,
      publishedAt: new Date(),
      metaTitle: "Burnout vs Depression: How to Tell the Difference | Ealho Therapy",
      metaDesc:
        "Burnout and depression share symptoms but are different conditions requiring different approaches. Here is how to tell them apart.",
    },
  ];

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: post,
    });
  }
  console.log("✅ Sample blog posts seeded");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
