import { Theme } from './settings/types';
import { FluidSection2WireframeSystemTransformation } from './components/generated/FluidSection2WireframeSystemTransformation';

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
      <FluidSection2WireframeSystemTransformation />
    </>
  ); // %EXPORT_STATEMENT%
}

export default App;
