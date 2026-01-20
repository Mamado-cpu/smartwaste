import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Facebook, Twitter } from "lucide-react";

const Wave = () => (
  <svg viewBox="0 0 1440 120" className="w-full block" preserveAspectRatio="none" aria-hidden>
    <path d="M0,40 C200,120 400,0 720,48 C1040,96 1240,32 1440,64 L1440 120 L0 120 Z" fill="url(#g)" />
    <defs>
      <linearGradient id="g" x1="0" x2="1">
        <stop offset="0%" stopColor="#083344" />
        <stop offset="100%" stopColor="#2a9d8f" />
      </linearGradient>
    </defs>
  </svg>
);

const Footer = () => {
  return (
    <footer className="bg-[#05282f] text-slate-100">
      <div className="-mt-6">
        <Wave />
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-start gap-3">
              {/* <div className="bg-[#2a9d8f] rounded-full p-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M3 13h2l1 7h10l1-7h2" stroke="#05282f" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 6h14l-1 7H6L5 6z" stroke="#05282f" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div> */}

              <div className="h-8 w-8 rounded-lg bg-gradient-hero flex items-center justify-center">
              <span className="text-white font-bold text-sm">🇬🇲</span>
            </div>
              <div>
                <h3 className="font-extrabold text-2xl">SmartWaste</h3>
                <p className="text-sm text-slate-200 mt-1">Community-first waste collection</p>
              </div>
            </div>

            <p className="mt-4 text-slate-300 max-w-xs">
              Quickly report overflowing bins, schedule pickups, and track collector trucks in your area.
              We prioritize safety and recyclables separation.
            </p>

          </div>

          <div>
            <h4 className="font-semibold mb-3">How it helps</h4>
            <ul className="space-y-2 text-slate-200">
              <li>Fast responses to overflowing bins</li>
              <li>Track collection schedules</li>
              <li>Separate recycling & organic pickup</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">For Collectors</h4>
            <ul className="space-y-2 text-slate-200">
              <li>Realtime assignments</li>
              <li>Route optimization</li>
              <li>Keep cleared tasks visible</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <div className="text-slate-200 space-y-2">
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> <span className="text-sm">Banjul</span></div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> <span className="text-sm">+220 3329739</span></div>
              <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> <span className="text-sm">smartwaste374@gamil.com</span></div>

              {/* <div className="flex gap-2 mt-3">
                <a href="#" aria-label="facebook" className="p-2 rounded-md hover:bg-white/5">
                  <Facebook className="h-5 w-5 text-slate-100" />
                </a>
                <a href="#" aria-label="twitter" className="p-2 rounded-md hover:bg-white/5">
                  <Twitter className="h-5 w-5 text-slate-100" />
                </a>
              </div> */}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-700 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-slate-400 text-sm">&copy; 2026 SmartWaste. Designed for community cleanliness.</p>
          <div className="text-slate-300 text-sm">Need urgent help? <span className="font-semibold">+220 3329739</span></div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;