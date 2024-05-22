// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from './app.module.scss';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import NxWelcome from './nx-welcome';

export function App() {
  return (
    <div>
      <Router>
        <Route path="/example" component={Example} />
        <Route path="/example" render={() => <Example />} />
      </Router>
    </div>
  );
}

export default App;
