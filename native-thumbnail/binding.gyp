{
  "targets": [
    {
      "target_name": "macos_thumbnail",
      "sources": [ "src/addon.mm" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "xcode_settings": {
        "OTHER_CPLUSPLUSFLAGS": ["-std=c++17", "-stdlib=libc++", "-fobjc-arc"],
        "OTHER_LDFLAGS": [
            "-framework Foundation", 
            "-framework ImageIO", 
            "-framework CoreGraphics", 
            "-framework CoreServices"
        ]
      }
    }
  ]
}
