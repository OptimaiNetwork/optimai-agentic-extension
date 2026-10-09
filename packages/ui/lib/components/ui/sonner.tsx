import * as React from 'react'
import { Toaster as SonnerToaster } from 'sonner'

type ToasterProps = React.ComponentProps<typeof SonnerToaster>

const Toaster = (props: ToasterProps) => {
  return (
    <SonnerToaster
      richColors
      closeButton
      className="md:![--width:600px] xl:![--width:656px]"
      duration={5000}
      position="top-center"
      visibleToasts={1}
      {...props}
    />
  )
}

export { Toaster }
