"use client";

import Link from "next/link";
import { Shield, GlassWater, Users, DollarSign, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  const roles = [
    {
      id: "admin",
      title: "ADMINISTRADOR",
      description: "Gestiona usuarios, perfiles, reportes y rendimiento general.",
      icon: Shield,
      color: "from-blue-600 to-blue-800",
      hoverColor: "hover:border-blue-500",
      bgColor: "bg-blue-50",
      href: "/admin-login",
      tagline: "Control total. Rentabilidad real.",
    },
    {
      id: "caja",
      title: "CAJA",
      description: "Gestiona cobros, pedidos y cierre de caja.",
      icon: DollarSign,
      color: "from-emerald-600 to-emerald-800",
      hoverColor: "hover:border-emerald-500",
      bgColor: "bg-emerald-50",
      href: "/caja-login",
      tagline: "Control de pagos y pedidos.",
    },
    {
      id: "bartender",
      title: "BARTENDER",
      description: "Prepara bebidas y gestiona pedidos.",
      icon: GlassWater,
      color: "from-green-600 to-green-800",
      hoverColor: "hover:border-green-500",
      bgColor: "bg-green-50",
      href: "/bartender-login",
      tagline: "Acceso con código de seguridad.",
    },
    
    {
      id: "mesero",
      title: "MESERO",
      description: "Gestiona mesas y toma pedidos.",
      icon: Users,
      color: "from-orange-500 to-orange-700",
      hoverColor: "hover:border-orange-500",
      bgColor: "bg-orange-50",
      href: "/mesero-login",
      tagline: "Acceso con código de seguridad.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center p-2 sm:p-3 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg mb-3 sm:mb-4">
            <span className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
              BARRANCO
            </span>
            <span className="ml-2 text-[10px] sm:text-xs md:text-sm font-semibold text-amber-600 bg-amber-100 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">
              INTELLIGENCE SYSTEM
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">
            SELECCIÓN DE ROL
          </h2>
          <p className="text-sm sm:text-base text-gray-500 mt-1 sm:mt-2">
            Selecciona tu perfil para acceder al sistema
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 max-w-6xl mx-auto">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Link key={role.id} href={role.href} className="block h-full">
                <Card
                  className={`${role.bgColor} border-2 ${role.hoverColor} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer group h-full flex flex-col`}
                >
                  <CardHeader className="p-4 sm:p-5 md:p-6 flex-1">
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-r ${role.color} flex items-center justify-center text-white mb-3 sm:mb-4 group-hover:scale-110 transition-transform shadow-lg`}
                    >
                      <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>
                    <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold">
                      {role.title}
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      {role.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
                    <Button
                      className={`w-full bg-gradient-to-r ${role.color} text-white hover:opacity-90 text-sm sm:text-base py-2 sm:py-2.5`}
                    >
                      <span className="truncate">Ingresar como {role.title}</span>
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-2 sm:mt-3 text-center">
                      {role.tagline}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-6 sm:mt-8 md:mt-12">
          <p className="text-[10px] sm:text-xs text-gray-400">
            © {new Date().getFullYear()} Barranco Intelligence System. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
