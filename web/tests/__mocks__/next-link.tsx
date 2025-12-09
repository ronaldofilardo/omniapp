import React from 'react'

export default function Link({ href, children, className, onClick, ...rest }: any) {
  return (
    <a href={href} className={className} onClick={onClick} {...rest}>
      {children}
    </a>
  )
}
