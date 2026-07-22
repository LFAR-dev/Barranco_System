"use client";

import Link from "next/link";
import { Shield, GlassWater, Users } from "lucide-react";
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
      bgColor: "bg-blue-50",
      href: "/admin-login",
      tagline: "Control total. Rentabilidad real.",
    },
    {
      id: "bartender",
      title: "BARTENDER",
      description: "Prepara bebidas y gestiona pedidos.",
      icon: GlassWater,
      color: "from-green-600 to-green-800",
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
      bgColor: "bg-orange-50",
      href: "/mesero-login",
      tagline: "Acceso con código de seguridad.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-black/5 rounded-2xl backdrop-blur-sm mb-4">
            <span className="text-4xl font-black text-gray-900 tracking-tight">BARRANCO</span>
            <span className="ml-2 text-sm font-semibold text-amber-600 bg-amber-100 px-3 py-1 rounded-full">INTELLIGENCE SYSTEM</span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-700">SELECCIÓN DE ROL</h2>
          <p className="text-gray-500 mt-2">Selecciona tu perfil para acceder al sistema</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Link key={role.id} href={role.href}>
                <Card
                  className={`${role.bgColor} border-2 hover:border-${
                    role.id === "admin" ? "blue" : role.id === "bartender" ? "green" : "orange"
                  }-500 transition-all duration-300 hover:scale-105 cursor-pointer group`}
                >
                  <CardHeader>
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${role.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-2xl">{role.title}</CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className={`w-full bg-gradient-to-r ${role.color} text-white hover:opacity-90`}
                    >
                      Ingresar como {role.title}
                    </Button>
                    <p className="text-xs text-gray-500 mt-3 text-center">{role.tagline}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  )
}
