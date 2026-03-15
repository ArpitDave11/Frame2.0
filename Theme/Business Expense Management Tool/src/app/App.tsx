import { Header } from "./components/Header";
import { PageHeadline } from "./components/PageHeadline";
import { SectionHeader } from "./components/SectionHeader";
import { DoubleImage } from "./components/DoubleImage";
import { Doormat } from "./components/Doormat";
import { PrivacyBanner } from "./components/PrivacyBanner";
import { Carousel, CarouselSlide } from "./components/Carousel";

export default function App() {
  const heroSlides: CarouselSlide[] = [
    {
      image: "https://images.unsplash.com/photo-1773168279830-afa53a3551f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBpbnZlc3RtZW50JTIwcG9ydGZvbGlvJTIwd2VhbHRofGVufDF8fHx8MTc3MzU0MDE2OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      imageAlt: "Investment portfolio management",
      caption: "Wealth Management",
      headline: "Grow Your Portfolio with Confidence",
      description: "Personalized investment strategies backed by global expertise and local insight.",
    },
    {
      image: "https://images.unsplash.com/photo-1758518731457-5ef826b75b3b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Jwb3JhdGUlMjB0ZWFtJTIwY29sbGFib3JhdGlvbiUyMHN0cmF0ZWd5fGVufDF8fHx8MTc3MzU0MDE2OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      imageAlt: "Corporate team collaboration",
      caption: "Advisory Services",
      headline: "Strategic Partnerships for Growth",
      description: "Our team of experts works alongside you to navigate complex financial landscapes.",
    },
    {
      image: "https://images.unsplash.com/photo-1768055104895-e6185762f2a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnbG9iYWwlMjBtYXJrZXRzJTIwdHJhZGluZyUyMGZpbmFuY2V8ZW58MXx8fHwxNzczNTQwMTY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      imageAlt: "Global markets trading",
      caption: "Capital Markets",
      headline: "Access Global Opportunities",
      description: "Leverage our worldwide network to capitalize on emerging market trends.",
    },
    {
      image: "https://images.unsplash.com/photo-1607369165516-0e831913b397?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdXN0YWluYWJsZSUyMGludmVzdG1lbnQlMjBFU0clMjBncmVlbnxlbnwxfHx8fDE3NzM1NDAxNjl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      imageAlt: "Sustainable investment",
      caption: "Sustainable Investing",
      headline: "Invest for a Better Future",
      description: "ESG-focused strategies that align financial returns with positive impact.",
    },
  ];

  const defaultSlides: CarouselSlide[] = heroSlides.map((s) => ({
    image: s.image,
    imageAlt: s.imageAlt,
  }));

  const doormatColumns = [
    {
      title: 'About UBS',
      links: [
        { label: 'Our Firm', href: '#' },
        { label: 'Leadership', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Newsroom', href: '#' },
      ],
    },
    {
      title: 'Services',
      links: [
        { label: 'Wealth Management', href: '#' },
        { label: 'Asset Management', href: '#' },
        { label: 'Investment Banking', href: '#' },
        { label: 'Personal Banking', href: '#' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Research & Insights', href: '#' },
        { label: 'Market Commentary', href: '#' },
        { label: 'Education Center', href: '#' },
        { label: 'Tools & Calculators', href: '#' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '#' },
        { label: 'Terms of Use', href: '#' },
        { label: 'Disclaimer', href: '#' },
        { label: 'Contact Us', href: '#' },
      ],
    },
  ];

  const handleAccept = () => {
    console.log('Cookies accepted');
  };

  const handleReject = () => {
    console.log('Cookies rejected');
  };

  const handleSettings = () => {
    console.log('Open cookie settings');
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <div className="max-w-[1920px] mx-auto px-8 py-12">
          <PageHeadline
            caption="Welcome to UBS"
            headline="Investment Solutions for Your Future"
            size="large"
            info="Discover tailored financial strategies designed to help you achieve your goals with confidence and precision."
            leadtext="Our comprehensive approach combines global expertise with local insights to deliver exceptional value."
          />

          <DoubleImage
            leftImage="https://images.unsplash.com/photo-1623679072629-3aaa0192a391?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB3b3Jrc3BhY2UlMjBkZXNrfGVufDF8fHx8MTc3MzQ4NjIwOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            rightImage="https://images.unsplash.com/photo-1758518731457-5ef826b75b3b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMG1lZXRpbmclMjBwcm9mZXNzaW9uYWxzfGVufDF8fHx8MTc3MzUzNjgzM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            leftImageAlt="Modern office workspace"
            rightImageAlt="Business professionals in meeting"
            align="right"
          />

          <SectionHeader
            headline="Our Services"
            infoLine="Comprehensive financial solutions tailored to your needs"
            keyline="default"
            spacingBelow="large"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">Wealth Management</h3>
              <p className="text-gray-600">Personalized investment strategies for long-term growth</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">Asset Management</h3>
              <p className="text-gray-600">Professional portfolio management and optimization</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">Investment Banking</h3>
              <p className="text-gray-600">Strategic advisory and capital markets expertise</p>
            </div>
          </div>

          <SectionHeader
            headline="Why Choose UBS"
            keyline="large"
            spacingBelow="medium"
          />

          <DoubleImage
            leftImage="https://images.unsplash.com/photo-1762279389020-eeeb69c25813?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5hbmNpYWwlMjBjaGFydHMlMjBncmFwaHN8ZW58MXx8fHwxNzczNDk2NzYwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            rightImage="https://images.unsplash.com/photo-1757233451731-9a34e164b208?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwc2t5bGluZSUyMGFyY2hpdGVjdHVyZXxlbnwxfHx8fDE3NzM0ODY1NDB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            leftImageAlt="Financial charts and graphs"
            rightImageAlt="City skyline architecture"
            align="left"
          />

          <PageHeadline
            headline="Medium Size Headline"
            size="medium"
            info="This demonstrates a medium-sized headline without a caption."
            showImpulseLine={true}
          />

          <PageHeadline
            caption="Small Format"
            headline="Compact Headline Example"
            size="small"
            showImpulseLine={true}
          />

          {/* Carousel Demos */}
          <SectionHeader
            headline="Carousel — Hero Variant"
            infoLine="Full-width hero carousel with autoplay, gradient overlays, and caption overlays"
            keyline="default"
            spacingBelow="large"
          />
        </div>

        <Carousel
          slides={heroSlides}
          variant="hero"
          autoplay={true}
          autoplayDelay={6000}
          infiniteLoop={true}
          showIndicators={true}
          showArrows={true}
          showAutoplayControls={true}
          showGradients={true}
          showCounter={true}
        />

        <div className="max-w-[1920px] mx-auto px-8 py-12">
          <SectionHeader
            headline="Carousel — Default Variant"
            infoLine="Simple image carousel with indicator dots and arrow navigation"
            keyline="default"
            spacingBelow="large"
          />
        </div>

        <div className="max-w-[1200px] mx-auto px-8 mb-12">
          <Carousel
            slides={defaultSlides}
            variant="default"
            showIndicators={true}
            showArrows={true}
            showCounter={true}
          />
        </div>

        <div className="max-w-[1920px] mx-auto px-8 pb-12">
          <SectionHeader
            headline="Carousel — Card Variant"
            infoLine="Compact card carousel with autoplay controls"
            keyline="default"
            spacingBelow="large"
          />
        </div>

        <div className="max-w-[960px] mx-auto px-8 mb-16">
          <Carousel
            slides={heroSlides}
            variant="card"
            autoplay={true}
            autoplayDelay={4000}
            infiniteLoop={true}
            showIndicators={true}
            showArrows={true}
            showAutoplayControls={true}
            showGradients={true}
          />
        </div>
      </main>

      <Doormat columns={doormatColumns} />
      
      <PrivacyBanner
        text="We use cookies and other technologies to enhance your experience and analyze site traffic. By clicking 'Accept all', you consent to our use of cookies."
        privacyPolicyLink="#privacy"
        onAccept={handleAccept}
        onReject={handleReject}
        onSettings={handleSettings}
        showSettings={true}
      />
    </div>
  );
}