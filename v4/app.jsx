/* eslint-disable */
// Peninsula Insider — Home, reimagined. App root.
function App() {
  window.useReveal();
  return (
    <React.Fragment>
      <Masthead />
      <main>
        <Hero />
        <AskSection />
        <Weekend />
        <Journal />
        <Interstitial />
        <Places />
        <InsiderMap />
        <Plans />
        <Shortlist />
        <Letter />
        <Newsletter />
      </main>
      <Footer />
      <MobileBar />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
