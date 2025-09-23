import React, { useState } from 'react'
import Login from './Login'
import SignUp from './SignUp'

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true)

  const toggleMode = () => {
    setIsLogin(!isLogin)
  }

  return (
    <>
      {isLogin ? (
        <Login onToggleMode={toggleMode} />
      ) : (
        <SignUp onToggleMode={toggleMode} />
      )}
    </>
  )
}

export default Auth