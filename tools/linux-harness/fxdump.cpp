// fxdump: compile a ReShade FX effect with the real ReShadeFX front-end and dump
// reflection (JSON) + per-entry-point GLSL so a GL harness can execute it.
#include "effect_parser.hpp"
#include "effect_codegen.hpp"
#include "effect_preprocessor.hpp"
#include <cstring>
#include <fstream>
#include <iostream>
#include <sstream>

using namespace reshadefx;

static std::string esc(const std::string &s)
{
	std::string o;
	for (char c : s) {
		switch (c) {
		case '"': o += "\\\""; break;
		case '\\': o += "\\\\"; break;
		case '\n': o += "\\n"; break;
		case '\r': break;
		case '\t': o += "\\t"; break;
		default: if ((unsigned char)c < 0x20) { char b[8]; snprintf(b, 8, "\\u%04x", c); o += b; } else o += c;
		}
	}
	return o;
}

static std::string const_json(const type &t, const constant &c)
{
	std::ostringstream o;
	if (t.base == type::t_string) { o << '"' << esc(c.string_data) << '"'; return o.str(); }
	unsigned n = t.components(); if (n == 0) n = 1; if (n > 16) n = 16;
	o << '[';
	for (unsigned i = 0; i < n; ++i) {
		if (i) o << ',';
		if (t.is_floating_point()) o << c.as_float[i];
		else if (t.base == type::t_uint || t.base == type::t_min16uint) o << c.as_uint[i];
		else o << c.as_int[i];
	}
	o << ']';
	return o.str();
}

static std::string annos_json(const std::vector<annotation> &annos)
{
	std::ostringstream o; o << '{';
	bool first = true;
	for (const auto &a : annos) { if (!first) o << ','; first = false; o << '"' << esc(a.name) << "\":" << const_json(a.type, a.value); }
	o << '}';
	return o.str();
}

static const char *base_name(const type &t)
{
	switch (t.base) {
	case type::t_bool: return "bool"; case type::t_int: case type::t_min16int: return "int";
	case type::t_uint: case type::t_min16uint: return "uint"; case type::t_float: case type::t_min16float: return "float";
	default: return "other";
	}
}

int main(int argc, char *argv[])
{
	if (argc < 4) { std::cerr << "usage: fxdump <file.fx> <outdir> <width> <height> [-I path]* [-D k=v]*\n"; return 1; }
	const std::string src = argv[1], outdir = argv[2];
	preprocessor pp;
	for (int i = 5; i < argc; ++i) {
		if (!strcmp(argv[i], "-I")) pp.add_include_path(argv[++i]);
		else if (!strcmp(argv[i], "-D")) { std::string d = argv[++i]; auto p = d.find('='); pp.add_macro_definition(d.substr(0, p), p == std::string::npos ? "1" : d.substr(p + 1)); }
	}
	pp.add_macro_definition("__RESHADE__", "60501");
	pp.add_macro_definition("__RESHADE_PERFORMANCE_MODE__", "0");
	pp.add_macro_definition("__RENDERER__", getenv("FXDUMP_HLSL") ? "0xb000" : "0x14300");
	pp.add_macro_definition("__APPLICATION__", "0x0");
	pp.add_macro_definition("__VENDOR__", "0x10de");
	pp.add_macro_definition("__DEVICE__", "0x0");
	pp.add_macro_definition("BUFFER_WIDTH", argv[3]);
	pp.add_macro_definition("BUFFER_HEIGHT", argv[4]);
	pp.add_macro_definition("BUFFER_RCP_WIDTH", "(1.0 / BUFFER_WIDTH)");
	pp.add_macro_definition("BUFFER_RCP_HEIGHT", "(1.0 / BUFFER_HEIGHT)");
	pp.add_macro_definition("BUFFER_COLOR_BIT_DEPTH", "8");
	pp.add_macro_definition("BUFFER_COLOR_SPACE", "1");
	if (!pp.append_file(src)) { std::cerr << pp.errors(); return 2; }
	const bool hlsl = getenv("FXDUMP_HLSL") != nullptr;

	std::unique_ptr<codegen> backend(hlsl ? create_codegen_hlsl(50, false, false) : create_codegen_glsl(false, false, false, false, true));
	parser p;
	if (!p.parse(pp.output(), backend.get())) { std::cerr << pp.errors() << p.errors(); return 2; }
	if (!pp.errors().empty() || !p.errors().empty()) std::cerr << pp.errors() << p.errors();
	const effect_module &m = backend->module();
	std::ostringstream j;
	j << "{\"textures\":[";
	for (size_t i = 0; i < m.textures.size(); ++i) {
		const auto &t = m.textures[i]; if (i) j << ',';
		j << "{\"name\":\"" << esc(t.name) << "\",\"unique_name\":\"" << esc(t.unique_name) << "\",\"semantic\":\"" << esc(t.semantic)
		  << "\",\"width\":" << t.width << ",\"height\":" << t.height << ",\"levels\":" << t.levels << ",\"format\":" << (int)t.format
		  << ",\"render_target\":" << (t.render_target ? "true" : "false") << ",\"annotations\":" << annos_json(t.annotations) << '}';
	}
	j << "],\"samplers\":[";
	for (size_t i = 0; i < m.samplers.size(); ++i) {
		const auto &s = m.samplers[i]; if (i) j << ',';
		j << "{\"name\":\"" << esc(s.name) << "\",\"unique_name\":\"" << esc(s.unique_name) << "\",\"texture\":\"" << esc(s.texture_name)
		  << "\",\"filter\":" << (int)s.filter << ",\"address_u\":" << (int)s.address_u << ",\"address_v\":" << (int)s.address_v
		  << ",\"srgb\":" << (s.srgb ? "true" : "false") << ",\"min_lod\":" << s.min_lod << ",\"max_lod\":" << s.max_lod << ",\"lod_bias\":" << s.lod_bias << '}';
	}
	j << "],\"uniforms\":[";
	for (size_t i = 0; i < m.uniforms.size(); ++i) {
		const auto &u = m.uniforms[i]; if (i) j << ',';
		j << "{\"name\":\"" << esc(u.name) << "\",\"offset\":" << u.offset << ",\"size\":" << u.size << ",\"base\":\"" << base_name(u.type)
		  << "\",\"rows\":" << (int)u.type.rows << ",\"cols\":" << (int)u.type.cols << ",\"array\":" << u.type.array_length
		  << ",\"annotations\":" << annos_json(u.annotations);
		if (u.has_initializer_value) j << ",\"init\":" << const_json(u.type, u.initializer_value);
		j << '}';
	}
	j << "],\"total_uniform_size\":" << m.total_uniform_size << ",\"techniques\":[";
	for (size_t i = 0; i < m.techniques.size(); ++i) {
		const auto &t = m.techniques[i]; if (i) j << ',';
		j << "{\"name\":\"" << esc(t.name) << "\",\"annotations\":" << annos_json(t.annotations) << ",\"passes\":[";
		for (size_t k = 0; k < t.passes.size(); ++k) {
			const auto &ps = t.passes[k]; if (k) j << ',';
			j << "{\"name\":\"" << esc(ps.name) << "\",\"vs\":\"" << esc(ps.vs_entry_point) << "\",\"ps\":\"" << esc(ps.ps_entry_point) << "\",\"rts\":[";
			bool f = true;
			for (int r = 0; r < 8; ++r) if (!ps.render_target_names[r].empty()) { if (!f) j << ','; f = false; j << '"' << esc(ps.render_target_names[r]) << '"'; }
			j << "],\"clear\":" << (ps.clear_render_targets ? "true" : "false") << ",\"gen_mips\":" << (ps.generate_mipmaps ? "true" : "false")
			  << ",\"srgb_write\":" << (ps.srgb_write_enable ? "true" : "false") << ",\"blend\":" << (ps.blend_enable[0] ? "true" : "false")
			  << ",\"src_blend\":" << (int)ps.source_color_blend_factor[0] << ",\"dst_blend\":" << (int)ps.dest_color_blend_factor[0] << ",\"blend_op\":" << (int)ps.color_blend_op[0]
			  << ",\"vp_w\":" << ps.viewport_width << ",\"vp_h\":" << ps.viewport_height << ",\"num_vertices\":" << ps.num_vertices << ",\"topology\":" << (int)ps.topology
			  << ",\"bindings\":[";
			for (size_t b = 0; b < ps.texture_bindings.size(); ++b) { if (b) j << ','; j << "{\"sampler\":" << ps.texture_bindings[b].index << ",\"binding\":" << ps.texture_bindings[b].entry_point_binding << ",\"srgb\":" << (ps.texture_bindings[b].srgb ? "true" : "false") << '}'; }
			j << "]}";
		}
		j << "]}";
	}
	j << "],\"entry_points\":[";
	for (size_t i = 0; i < m.entry_points.size(); ++i) {
		if (i) j << ',';
		const auto &e = m.entry_points[i];
		j << "{\"name\":\"" << esc(e.first) << "\",\"type\":" << (int)e.second << '}';
		std::string code, assembly, errors;
		if (!backend->assemble_code_for_entry_point(e.first, code, assembly, errors)) { std::cerr << "assemble failed " << e.first << ": " << errors; return 3; }
		std::ofstream(outdir + "/" + e.first + (hlsl ? ".hlsl" : ".glsl")) << code;
	}
	j << "]}";
	std::ofstream(outdir + "/module.json") << j.str();
	std::cerr << p.errors();
	return 0;
}
