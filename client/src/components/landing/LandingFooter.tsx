import React from 'react';
import Footer22 from '../ui/footer-22';

export const LandingFooter: React.FC = () => {
  return (
    <div className="landing-footer" data-cinematic-scroll-footer>
      <Footer22
        theme="black"
        brandName="procura"
        offerColumns={[
          {
            title: 'Product',
            links: [
              { label: 'Platform', href: '#platform' },
              { label: 'SpendGuard', href: '#product' },
              { label: 'Workflow', href: '#workflow' },
              { label: 'FAQ', href: '#faq' },
            ],
          },
          {
            title: 'Workspace',
            links: [
              { label: 'Overview', href: '/app' },
              { label: 'New request', href: '/app?tab=new-request' },
              { label: 'Catalog', href: '/app?tab=catalog' },
              { label: 'History', href: '/app?tab=history' },
            ],
          },
          {
            title: 'Trust',
            links: [
              { label: 'SpendGuard controls', href: '#product' },
              { label: 'Sandbox checkout', href: '#product' },
              { label: 'AI recommendations', href: '#workflow' },
              { label: 'Demo boundaries', href: '#faq' },
            ],
          },
          {
            title: 'About',
            links: [
              { label: 'PayPal AI Hackathon', href: '#top' },
              { label: 'MIT licensed', href: '#top' },
              { label: 'Documentation', href: '#faq' },
              { label: 'Open workspace', href: '/app' },
            ],
          },
        ]}
        newsletterHeadline="Make the next purchase clearer"
        newsletterDescription="Explore the Procura demo workspace and see every decision in context."
        contactHeading="Start a request"
        contactDescription="Payments use PayPal Sandbox. Catalog and history records are simulated unless your local API is running."
        emailContact="m.dinesh.it27@gmail.com"
        bottomLinks={[
          { label: 'Platform', href: '#platform' },
          { label: 'Product', href: '#product' },
          { label: 'Workflow', href: '#workflow' },
          { label: 'FAQ', href: '#faq' },
        ]}
      />
    </div>
  );
};
