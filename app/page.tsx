import Link from "next/link";
import {
  Phone,
  BarChart3,
  ArrowRight,
  Headphones,
  GitBranch,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Headphones,
    title: "24/7 AI Receptionist",
    description:
      "Never miss a call again. Our AI voice agents answer every call instantly, providing professional service around the clock.",
  },
  {
    icon: GitBranch,
    title: "Smart Call Routing",
    description:
      "Intelligent call routing ensures your customers reach the right person or department every time, reducing wait times.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description:
      "Track call volumes, response times, booking rates, and customer satisfaction with live dashboards and reports.",
  },
];

const pricingTiers = [
  {
    name: "Starter",
    price: "$297",
    period: "/mo",
    minutes: "500 minutes",
    features: [
      "AI voice receptionist",
      "Call recording & transcripts",
      "Basic analytics dashboard",
      "Email support",
      "1 phone number",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$497",
    period: "/mo",
    minutes: "1,000 minutes",
    features: [
      "Everything in Starter",
      "Smart call routing",
      "CRM integrations",
      "Priority support",
      "3 phone numbers",
      "Custom greeting scripts",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    name: "Scale",
    price: "$997",
    period: "/mo",
    minutes: "Unlimited minutes",
    features: [
      "Everything in Growth",
      "Advanced analytics & reporting",
      "API access",
      "Dedicated account manager",
      "Unlimited phone numbers",
      "White-label options",
      "Custom AI training",
    ],
    cta: "Get Started",
    highlighted: false,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-navy-500/95 backdrop-blur-sm border-b border-navy-400/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Phone className="h-6 w-6 text-gold" />
              <span className="text-xl font-bold text-white">
                Aussie AI Agency
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-navy-200 hover:text-white transition-colors text-sm font-medium"
              >
                Sign In
              </Link>
              <Link href="/signup">
                <Button className="bg-gold hover:bg-gold-600 text-navy-500 font-semibold text-sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-navy-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-600/50 via-navy-500 to-navy-400/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
              AI-Powered Receptionist for{" "}
              <span className="text-gold">Australian Businesses</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-navy-200 max-w-2xl mx-auto leading-relaxed">
              Never miss a call. Our AI voice agents handle bookings, FAQs, and
              lead capture 24/7.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-gold hover:bg-gold-600 text-navy-500 font-semibold text-base px-8 py-6"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-navy-300 text-navy-100 hover:bg-navy-400/30 hover:text-white text-base px-8 py-6"
                >
                  Learn More
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-500">
              Everything you need to{" "}
              <span className="text-gold">never miss a call</span>
            </h2>
            <p className="mt-4 text-lg text-navy-300 max-w-2xl mx-auto">
              Our AI platform handles your calls with the professionalism your
              customers expect.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white border border-navy-100 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow group"
              >
                <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-gold/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-gold" />
                </div>
                <h3 className="text-xl font-semibold text-navy-500 mb-3">
                  {feature.title}
                </h3>
                <p className="text-navy-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-navy-50 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-500">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-navy-300 max-w-2xl mx-auto">
              Choose the plan that fits your business. Scale up anytime.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-8 flex flex-col ${
                  tier.highlighted
                    ? "bg-navy-500 text-white ring-2 ring-gold shadow-xl scale-105"
                    : "bg-white text-navy-500 border border-navy-100 shadow-sm"
                }`}
              >
                <div className="mb-6">
                  <h3
                    className={`text-lg font-semibold ${
                      tier.highlighted ? "text-gold" : "text-navy-400"
                    }`}
                  >
                    {tier.name}
                  </h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span
                      className={
                        tier.highlighted ? "text-navy-200" : "text-navy-300"
                      }
                    >
                      {tier.period}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-sm ${
                      tier.highlighted ? "text-navy-200" : "text-navy-300"
                    }`}
                  >
                    {tier.minutes}
                  </p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check
                        className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                          tier.highlighted ? "text-gold" : "text-gold-500"
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          tier.highlighted ? "text-navy-100" : "text-navy-400"
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button
                    className={`w-full font-semibold ${
                      tier.highlighted
                        ? "bg-gold hover:bg-gold-600 text-navy-500"
                        : "bg-navy-500 hover:bg-navy-600 text-white"
                    }`}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-500 border-t border-navy-400/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-gold" />
              <span className="text-lg font-semibold text-white">
                Aussie AI Agency
              </span>
            </div>
            <p className="text-navy-300 text-sm">
              &copy; {new Date().getFullYear()} Aussie AI Agency. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
