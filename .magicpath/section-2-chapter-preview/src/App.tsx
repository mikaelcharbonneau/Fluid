import { Theme } from './settings/types';
import { FluidSection2WireframeChapterPreview } from './components/generated/FluidSection2WireframeChapterPreview';

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
      <FluidSection2WireframeChapterPreview />
    </>
  ); // %EXPORT_STATEMENT%
}

export default App;
