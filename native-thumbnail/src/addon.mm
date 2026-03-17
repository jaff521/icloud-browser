#include <napi.h>
#import <Foundation/Foundation.h>
#import <ImageIO/ImageIO.h>
#import <CoreGraphics/CoreGraphics.h>
#import <CoreServices/CoreServices.h>

using namespace Napi;

Value GetThumbnail(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        TypeError::New(env, "String expected for file path").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filePath = info[0].As<String>().Utf8Value();
    int size = 200;
    if (info.Length() > 1 && info[1].IsNumber()) {
        size = info[1].As<Number>().Int32Value();
    }

    @autoreleasepool {
        NSString *path = [NSString stringWithUTF8String:filePath.c_str()];
        NSURL *url = [NSURL fileURLWithPath:path];

        NSDictionary *options = @{
            (id)kCGImageSourceShouldCache: @NO,
            (id)kCGImageSourceShouldAllowFloat: @YES
        };
        CGImageSourceRef source = CGImageSourceCreateWithURL((__bridge CFURLRef)url, (__bridge CFDictionaryRef)options);

        if (!source) {
            Error::New(env, "Failed to create image source").ThrowAsJavaScriptException();
            return env.Null();
        }

        // Generate the thumbnail. The OS will use embedded thumbs if available!
        NSDictionary *thumbOptions = @{
            (id)kCGImageSourceCreateThumbnailFromImageIfAbsent: @YES,
            (id)kCGImageSourceCreateThumbnailWithTransform: @YES,
            (id)kCGImageSourceThumbnailMaxPixelSize: @(size)
        };

        CGImageRef thumb = CGImageSourceCreateThumbnailAtIndex(source, 0, (__bridge CFDictionaryRef)thumbOptions);
        CFRelease(source);
        
        if (!thumb) {
            Error::New(env, "Failed to create thumbnail").ThrowAsJavaScriptException();
            return env.Null();
        }

        NSMutableData *imageData = [NSMutableData data];
        CGImageDestinationRef dest = CGImageDestinationCreateWithData((__bridge CFMutableDataRef)imageData, kUTTypeJPEG, 1, NULL);
        if (!dest) {
            CGImageRelease(thumb);
            Error::New(env, "Failed to create image destination").ThrowAsJavaScriptException();
            return env.Null();
        }

        NSDictionary *destOptions = @{
            (id)kCGImageDestinationLossyCompressionQuality: @0.85
        };
        CGImageDestinationAddImage(dest, thumb, (__bridge CFDictionaryRef)destOptions);
        CGImageDestinationFinalize(dest);

        CFRelease(dest);
        CGImageRelease(thumb);

        if ([imageData length] == 0) {
            Error::New(env, "Failed to write jpeg data").ThrowAsJavaScriptException();
            return env.Null();
        }

        Buffer<char> result = Buffer<char>::Copy(env, (char *)[imageData bytes], [imageData length]);
        return result;
    }
}

Object Init(Env env, Object exports) {
    exports.Set(String::New(env, "getThumbnail"), Function::New(env, GetThumbnail));
    return exports;
}

NODE_API_MODULE(macos_thumbnail, Init)
