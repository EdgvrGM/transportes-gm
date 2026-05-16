import React, { useState } from "react";
import { supabase } from "@/supabaseClient";
import { Button } from "@/components/ui/button";
import { Award, X, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function QuoteForm({ primaryColor, secondaryColor }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Para enviar emails, Supabase usa Edge Functions.
      // Esta es una llamada de ejemplo a una función que podrías crear llamada 'contact-form'
      const { error } = await supabase.functions.invoke("contact-form", {
        body: formData,
      });

      if (error) throw error;

      setSubmitStatus("success");
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        message: "",
      });
    } catch (error) {
      console.error("Error sending quote:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">
            Nombre completo *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ej. Juan Pérez"
            required
            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 outline-none transition-all bg-gray-50/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="correo@empresa.com"
            required
            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 outline-none transition-all bg-gray-50/50"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">
            Teléfono *
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="10 dígitos"
            required
            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 outline-none transition-all bg-gray-50/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">
            Empresa (opcional)
          </label>
          <input
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            placeholder="Nombre de tu empresa"
            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 outline-none transition-all bg-gray-50/50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-700 ml-1">
          Tu mensaje *
        </label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Cuéntanos sobre tus necesidades de transporte..."
          required
          rows="5"
          className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 outline-none transition-all bg-gray-50/50 resize-none"
        />
      </div>

      {submitStatus === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <p className="font-medium">
            ¡Cotización enviada con éxito! Te contactaremos pronto.
          </p>
        </motion.div>
      )}

      {submitStatus === "error" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white flex-shrink-0">
            <X className="w-5 h-5" />
          </div>
          <p className="font-medium">
            Error al enviar. Por favor, llámanos directamente.
          </p>
        </motion.div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="btn-submit w-full text-lg py-7 font-black text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
        }}
      >
        {isSubmitting ? (
          <>
            <div className="w-6 h-6 border-3 border-gray-900 border-t-transparent rounded-full animate-spin mr-3" />
            Procesando...
          </>
        ) : (
          <>
            Enviar Solicitud
            <ChevronRight className="w-6 h-6 ml-2" />
          </>
        )}
      </Button>
    </form>
  );
}
