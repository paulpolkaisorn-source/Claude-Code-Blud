/*=============================================================================
    GrandMaster - shared helpers (color, noise, sampling, view-space math)
    Part of GrandMaster.fx for Unishade / ReShade. Original code.
=============================================================================*/
#pragma once

namespace GM
{
    static const float EPS = 1e-5;
    static const float3 LUMA_W = float3(0.2126, 0.7152, 0.0722);

    // ---------------------------------------------------------------- safety
    // Maps NaN/negative to 0 and clamps to [0, hi]. Comparisons with NaN are false.
    float SafeF(float x, float hi) { return (x > 0.0) ? min(x, hi) : 0.0; }
    float3 Safe3(float3 c, float hi) { return float3(SafeF(c.r, hi), SafeF(c.g, hi), SafeF(c.b, hi)); }
    float4 Safe4(float4 c, float hi) { return float4(SafeF(c.r, hi), SafeF(c.g, hi), SafeF(c.b, hi), SafeF(c.a, hi)); }

    float Max3(float3 c) { return max(c.r, max(c.g, c.b)); }
    float Min3(float3 c) { return min(c.r, min(c.g, c.b)); }
    float Luma(float3 c) { return dot(c, LUMA_W); }

    // ---------------------------------------------------------------- transfer
    float3 SRGBToLinear(float3 c)
    {
        c = saturate(c);
        float3 lo = c / 12.92;
        float3 hi = pow((c + 0.055) / 1.055, 2.4);
        return lerp(hi, lo, step(c, 0.04045));
    }

    float3 LinearToSRGB(float3 c)
    {
        c = saturate(c);
        float3 lo = c * 12.92;
        float3 hi = 1.055 * pow(max(c, 1e-7), 1.0 / 2.4) - 0.055;
        return lerp(hi, lo, step(c, 0.0031308));
    }

    // Reversible highlight expansion on the max channel (hue preserving).
    //   Expand  : m -> m / (1 - k m)        (display-linear -> scene-ish HDR)
    //   Compress: m -> m / (1 + k m)        (exact inverse, soft shoulder)
    // Round trip is identity, so with every effect off the image is untouched.
    float3 Expand(float3 lin, float k)
    {
        float m = Max3(lin);
        return lin / max(1.0 - k * m, 0.02);
    }

    float3 Compress(float3 hdr, float k)
    {
        float m = Max3(hdr);
        return hdr / (1.0 + k * m);
    }

    // ---------------------------------------------------------------- noise
    // Interleaved gradient noise (Jimenez 2014), in [0,1).
    float IGN(float2 p) { return frac(52.9829189 * frac(dot(p, float2(0.06711056, 0.00583715)))); }

    float Hash12(float2 p)
    {
        float3 p3 = frac(float3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return frac((p3.x + p3.y) * p3.z);
    }

    // ---------------------------------------------------------------- color
    // Hue in [0,1) and HSV-style saturation.
    float Hue(float3 c)
    {
        float mx = Max3(c), mn = Min3(c);
        float d = mx - mn;
        if (d < 1e-5) return 0.0;
        float h;
        if (mx == c.r)      h = (c.g - c.b) / d;
        else if (mx == c.g) h = 2.0 + (c.b - c.r) / d;
        else                h = 4.0 + (c.r - c.g) / d;
        return frac(h / 6.0 + 1.0);
    }

    float Sat(float3 c) { float mx = Max3(c); return (mx - Min3(c)) / max(mx, 1e-4); }

    // Soft-knee threshold response (returns the energy above the threshold).
    float SoftKnee(float x, float threshold, float knee)
    {
        float k = max(knee, 1e-4);
        float soft = clamp(x - threshold + k, 0.0, 2.0 * k);
        soft = soft * soft / (4.0 * k);
        return max(soft, x - threshold);
    }

    // ---------------------------------------------------------------- normals
    float3 DecodeNormal(float2 xy)
    {
        xy = clamp(xy, -1.0, 1.0);
        return float3(xy, -sqrt(saturate(1.0 - dot(xy, xy))));
    }
}
