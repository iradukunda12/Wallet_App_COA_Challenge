import { useState } from "react";
import { Navigate, Route, Routes, Outlet } from "react-router-dom";
import SignIn from "../../frontend/src/pages/auth/signin";
import SignUp from "../../frontend/src/pages/auth/singup";
import Dashboard from "./pages/dashboard";
import Transactions from "./pages/transaction";
import AccountPage from "./pages/account-page";
import Settings from "./pages/settings";
import useStore from "./store/index";
import { setAuthToken } from "./libs/apiCalls";
import { Toaster } from "sonner";
const RootLayout = () => {
  const { user } = useStore((state) => state);
  setAuthToken(user?.token || "");
  return !user ? (
    <Navigate to='sign-in' replace={true}></Navigate>
  ) : (
    <>
      <div className='min-h[cal(h-screen-100px)]'>
        <Outlet></Outlet>
      </div>
    </>
  );
};

function App() {
  const [count, setCount] = useState(0);

  return (
    <main>
      <div className='w-full min-h-screen px-6 bg-gray-100'>
        <Routes>
          <Route element={<RootLayout></RootLayout>}>
            <Route
              path='/'
              element={<Navigate to='/overview'></Navigate>}
            ></Route>
            <Route path='/overview' element={<Dashboard></Dashboard>}></Route>
            <Route
              path='/transactions'
              element={<Transactions></Transactions>}
            ></Route>
            <Route path='/settings' element={<Settings></Settings>}></Route>
            <Route
              path='/account'
              element={<AccountPage></AccountPage>}
            ></Route>
          </Route>
          <Route path='/sign-in' element={<SignIn></SignIn>}></Route>
          <Route path='/sign-up' element={<SignUp></SignUp>}></Route>
        </Routes>
      </div>
      <Toaster richColors position='top-center'></Toaster>
    </main>
  );
}

export default App;
