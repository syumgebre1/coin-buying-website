import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    { q: "How do I buy coins?", a: "Sign up, go to the dashboard, select a package or custom amount, and pay via TeleBirr, CBE, or International Card." },
    { q: "How do I withdraw to ETB?", a: "Go to your profile, click 'Withdraw ETB', enter your bank details, and the Admin will process it." },
    { q: "Are the casino games fair?", a: "Yes! All games use provably fair standard randomization algorithms (Math.random)." },
    { q: "What is the minimum withdrawal?", a: "The minimum withdrawal amount is 50 Coins." }
  ];

  return (
    <div style={{ color: '#333', backgroundColor: '#f8f9fa', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* HERO SECTION */}
      <div style={{ backgroundColor: '#1a237e', color: 'white', padding: '80px 20px', textAlign: 'center', borderBottomLeftRadius: '40px', borderBottomRightRadius: '40px', boxShadow: '0 10px 30px rgba(26,35,126,0.3)' }}>
        <h1 style={{ fontSize: '42px', margin: '0 0 20px 0', fontWeight: '900' }}>The Ultimate Coin Experience.</h1>
        <p style={{ fontSize: '18px', maxWidth: '600px', margin: '0 auto 30px auto', opacity: 0.9 }}>
          Buy coins, win big in our Casino Hub, and withdraw your earnings directly to your Ethiopian bank account.
        </p>
        <button onClick={() => navigate('/login')} style={{ padding: '15px 40px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#f57c00', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(245,124,0,0.4)' }}>
          Get Started
        </button>
      </div>

      {/* FEATURES SECTION */}
      <div style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', color: '#1a237e', marginBottom: '40px' }}>Why Choose Us?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>💸</div>
            <h3 style={{ margin: '0 0 10px 0' }}>Fast Top-Ups</h3>
            <p style={{ margin: 0, color: '#666' }}>Buy coins instantly using TeleBirr, CBE Birr, or International Cards.</p>
          </div>

          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>🎰</div>
            <h3 style={{ margin: '0 0 10px 0' }}>6 Casino Games</h3>
            <p style={{ margin: 0, color: '#666' }}>Bet your coins on Plinko, Slots, Coin Flip, and more to win big.</p>
          </div>

          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>🏦</div>
            <h3 style={{ margin: '0 0 10px 0' }}>Instant Withdrawals</h3>
            <p style={{ margin: 0, color: '#666' }}>Cash out your coins back to your bank account safely and securely.</p>
          </div>

        </div>
      </div>

      {/* HOW IT WORKS SECTION */}
      <div style={{ backgroundColor: '#e8eaf6', padding: '60px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', color: '#1a237e', marginBottom: '40px' }}>How It Works</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '40px', maxWidth: '800px', margin: '0 auto' }}>
          
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ width: '60px', height: '60px', backgroundColor: '#1a237e', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', margin: '0 auto 15px auto' }}>1</div>
            <h3>Create Account</h3>
            <p style={{ color: '#666' }}>Sign up with your email and get a welcome bonus.</p>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ width: '60px', height: '60px', backgroundColor: '#1a237e', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', margin: '0 auto 15px auto' }}>2</div>
            <h3>Buy Coins</h3>
            <p style={{ color: '#666' }}>Top up using your local bank and upload the receipt.</p>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ width: '60px', height: '60px', backgroundColor: '#1a237e', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', margin: '0 auto 15px auto' }}>3</div>
            <h3>Play & Earn</h3>
            <p style={{ color: '#666' }}>Play casino games or invite friends to win more coins.</p>
          </div>

        </div>
      </div>

      {/* FAQ SECTION */}
      <div style={{ padding: '60px 20px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '32px', color: '#1a237e', marginBottom: '40px', textAlign: 'center' }}>Frequently Asked Questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {faqs.map((faq, index) => (
            <div key={index} style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <button 
                onClick={() => toggleFaq(index)} 
                style={{ width: '100%', padding: '20px', textAlign: 'left', backgroundColor: 'white', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#333' }}
              >
                {faq.q}
                <span>{openFaq === index ? '−' : '+'}</span>
              </button>
              {openFaq === index && (
                <div style={{ padding: '0 20px 20px 20px', color: '#666', textAlign: 'left' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ backgroundColor: '#1a237e', color: 'white', padding: '30px', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} SYUM BET. Built by <a href="https://syum-portfolio.netlify.app" target="_blank" rel="noreferrer" style={{ color: '#f57c00', fontWeight: 'bold', textDecoration: 'none' }}>SYUM TEAME</a></p>
      </div>

    </div>
  );
}
