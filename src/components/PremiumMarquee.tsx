const PremiumMarquee = () => {
  const marqueeText = "ELEVATING STYLE | HERITAGE MEETS FUTURE | [NRTVEZ] COLLECTION | LUXURY CRAFTSMANSHIP | INNOVATION & DESIGN";
  
  return (
    <div className="premium-marquee-wrapper relative w-full overflow-hidden bg-transparent py-3 z-10">
      <div className="premium-marquee-content">
        <span className="premium-marquee-text">{marqueeText}</span>
        <span className="premium-marquee-text">{marqueeText}</span>
        <span className="premium-marquee-text">{marqueeText}</span>
      </div>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600&display=swap');
        
        .premium-marquee-wrapper {
          font-family: 'Poppins', sans-serif;
          position: relative;
        }
        
        .premium-marquee-content {
          display: flex;
          width: max-content;
          animation: premium-scroll 30s linear infinite;
        }
        
        .premium-marquee-text {
          display: inline-block;
          white-space: nowrap;
          padding-right: 3rem;
          font-weight: 600;
          font-size: 1rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #FFD700;
          text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
        }
        
        @media (min-width: 768px) {
          .premium-marquee-text {
            font-size: 1.125rem;
          }
        }
        
        @keyframes premium-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        
        .premium-marquee-content:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default PremiumMarquee;
