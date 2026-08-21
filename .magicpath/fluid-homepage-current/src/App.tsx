import { Theme } from './settings/types';
import { FluidHomepageCurrent } from './components/generated/FluidHomepageCurrent';

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
      <FluidHomepageCurrent />
    </>
  ); // %EXPORT_STATEMENT%
}

export default App;
