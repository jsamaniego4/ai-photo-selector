# Object Lens

A mobile-friendly photo identification app. Take a photo with your device camera or choose an image, and the app returns likely object matches with confidence scores.

## Run it

Serve this folder from a local web server, then open its URL on a phone or computer. Camera access requires HTTPS, except on `localhost`.

For example, if Node.js is installed:

```sh
npx serve .
```

Open the address printed by the server. On a phone, the camera button requests the rear-facing camera; **Choose photo** opens the device photo picker.

## How identification works

The app uses TensorFlow.js and the MobileNet image-classification model in the browser. The libraries and model weights are downloaded when needed. The first identification may take longer while the model loads. Once available, classification happens on-device: the selected photo is not uploaded to an application server.

MobileNet recognizes common ImageNet categories. Results are best-effort predictions, not definitive identifications, and may be less accurate for unusual objects, text, or specialist subjects. An internet connection is needed to load the model.
