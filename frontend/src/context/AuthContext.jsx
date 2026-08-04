import { createContext, useContext, useState } from 'react'

// TODO: wire up Firebase phone-auth here once the Firebase project
// is created. This context is what every page reads "who is logged
// in" from -- no page should implement its own login check.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null) // { uid, phoneNumber, token }

  const login = async (phoneNumber) => {
    // TODO: trigger Firebase OTP flow
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
