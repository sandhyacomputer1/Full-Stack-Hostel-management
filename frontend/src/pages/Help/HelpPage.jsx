// src/pages/Help/HelpPage.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Phone,
  Mail,
  Globe,
} from "lucide-react";

const HelpPage = () => {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const sectionRefs = useRef({});

  const faqs = [
    {
      q: "Why can’t I see some modules in the sidebar?",
      a: "Module visibility depends on your role. Admins see all modules, Managers see limited ones, and Watchmen see only Gate Entry and Profile. Contact your admin if you need access.",
    },
    {
      q: "How do I reset my password?",
      a: "Go to Profile → Change Password. Contact admin if locked out.",
    },
    {
      q: "Can I edit a student’s details?",
      a: "Yes. Go to Students → select student → Edit. Most fields can be updated.",
    },
    {
      q: "How do I generate reports?",
      a: "Go to Reports → select module → set date range → click Generate. Export as CSV/PDF.",
    },
    {
      q: "Payment recorded but receipt missing?",
      a: "Refresh the Fees page. If still missing, check bank status or contact support.",
    },
    {
      q: "How do I mark attendance?",
      a: "Go to Attendance → select date → mark present/absent for students.",
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleSections(prev => new Set([...prev, entry.target.dataset.section]));
        }
      },
      { threshold: 0.1 }
    );

    Object.keys(sectionRefs.current).forEach(sectionId => {
      if (sectionRefs.current[sectionId]) {
        observer.observe(sectionRefs.current[sectionId]);
      }
    });

    return () => {
      Object.keys(sectionRefs.current).forEach(sectionId => {
        if (sectionRefs.current[sectionId]) {
          observer.unobserve(sectionRefs.current[sectionId]);
        }
      });
    };
  }, []);

  // Inject CSS animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .slide-in-up {
        animation: slideInUp 0.6s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div 
          ref={el => sectionRefs.current.header = el}
          data-section="header"
          className={`bg-white rounded-xl shadow-sm border p-6 ${
            visibleSections.has('header') ? 'slide-in-up' : ''
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-sm">
              <HelpCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
              <p className="text-sm text-gray-600">Find guides, FAQs, and company info</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div 
          ref={el => sectionRefs.current.faq = el}
          data-section="faq"
          className={`bg-white rounded-xl shadow-sm border p-6 ${
            visibleSections.has('faq') ? 'slide-in-up' : ''
          }`}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{faq.q}</span>
                  {expandedFaq === i ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                {expandedFaq === i && (
                  <div className="px-4 pb-3 text-sm text-gray-600">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* About Company */}
        <div 
          ref={el => sectionRefs.current.about = el}
          data-section="about"
          className={`bg-white rounded-xl shadow-sm border p-6 ${
            visibleSections.has('about') ? 'slide-in-up' : ''
          }`}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">About Sandhya SoftTech Pvt Ltd</h2>
          <div className="space-y-4 text-sm text-gray-700">
            <p>
              Sandhya SoftTech Pvt Ltd is a leading technology company specializing in website development, Android app development, and customized software solutions. With 12+ innovative products and a growing family of 506+ clients, we deliver cutting-edge digital solutions tailored to your business needs.
            </p>
            <p>
              Our mission is to empower businesses with reliable, scalable, and user-friendly technology that drives growth and efficiency.
            </p>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-600" />
              <a
                href="https://www.sandhyasofttech.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1"
              >
                Visit our website
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div 
          ref={el => sectionRefs.current.contact = el}
          data-section="contact"
          className={`bg-white rounded-xl shadow-sm border p-6 ${
            visibleSections.has('contact') ? 'slide-in-up' : ''
          }`}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Support</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 p-2 rounded-lg">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Phone</p>
                <a
                  href="https://wa.me/919527537131"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-indigo-600 hover:underline"
                >
                  +91 9527537131
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Email</p>
                <a
                  href="mailto:sandhyasofttechpvtltd@gmail.com"
                  className="text-sm text-gray-600 hover:text-indigo-600 hover:underline"
                >
                  sandhyasofttechpvtltd@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2 rounded-lg">
                <Globe className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Website</p>
                <a
                  href="https://www.sandhyasofttech.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Sandhya SoftTech Pvt Ltd
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
