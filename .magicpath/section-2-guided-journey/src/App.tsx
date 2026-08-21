import { Theme } from './settings/types';
import { FluidSection2WireframeGuidedJourney } from './components/generated/FluidSection2WireframeGuidedJourney';

let theme: Theme = 'light';

function App() {
  function setTheme(theme: Theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  setTheme(theme);

  return (
    <>
      <FluidSection2WireframeGuidedJourney />
    </>
  ); // %EXPORT_STATEMENT%
}

export default App;
