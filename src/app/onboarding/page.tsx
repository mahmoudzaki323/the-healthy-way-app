import { ArrowRight, Check, Heart, Leaf, Zap } from "lucide-react"

import { completeOnboardingAction } from "@/lib/actions"
import { getCurrentProfile } from "@/lib/auth"
import { getPrograms } from "@/lib/data"
import { BrandMark, FoodAccent } from "@/components/brand-mark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

const foodSupport = [
  "Emotional eating",
  "Mindful eating",
  "Cravings & snacking",
  "Portion control",
  "Meal planning",
  "Building healthy habits",
]

const dietaryPreferences = [
  "No restrictions",
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Dairy-free",
  "Other",
]

export default async function OnboardingPage() {
  const profile = await getCurrentProfile("client", { allowIncompleteOnboarding: true })
  const programs = await getPrograms(profile)
  const defaultProgram = programs[0]?.id ?? ""

  return (
    <main className="min-h-screen bg-background">
      <FoodAccent className="h-24" />
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <BrandMark />
            <h1 className="mt-8 text-3xl font-semibold tracking-tight">
              Tell us about your goals
            </h1>
            <p className="mt-2 text-muted-foreground">
              This sets up your coaching profile, starter goals, program, and weekly plan.
            </p>
          </div>
          <div className="grid max-w-2xl flex-1 grid-cols-5 gap-2 text-xs text-muted-foreground">
            {["About You", "Goals", "Lifestyle", "Program", "Confirm"].map((step, index) => (
              <div key={step} className="text-center">
                <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-full border bg-card text-sm font-medium data-[active=true]:bg-primary data-[active=true]:text-primary-foreground" data-active={index === 0}>
                  {index + 1}
                </div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
        <form action={completeOnboardingAction} className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>About you</CardTitle>
              <CardDescription>
                Choose what fits right now. These can be updated later in profile settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-7">
              <div className="space-y-2">
                <Label htmlFor="fullName">What&apos;s your name?</Label>
                <Input id="fullName" name="fullName" defaultValue={profile.fullName} required />
              </div>
              <div className="space-y-3">
                <Label>What is your primary goal?</Label>
                <RadioGroup name="primaryGoal" defaultValue="Increase Energy" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Lose Weight", Heart],
                    ["Build Muscle", Check],
                    ["Increase Energy", Zap],
                    ["Improve Health", Leaf],
                  ].map(([goal, Icon]) => (
                    <Label
                      key={String(goal)}
                      htmlFor={String(goal)}
                      className="flex cursor-pointer items-center gap-3 rounded-md border p-3"
                    >
                      <RadioGroupItem id={String(goal)} value={String(goal)} />
                      <Icon className="size-4 text-primary" />
                      <span>{String(goal)}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label>What would you like support with around food?</Label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {foodSupport.map((item) => (
                    <Label key={item} className="flex items-center gap-3 rounded-md border p-3">
                      <Checkbox name="foodSupport" value={item} defaultChecked={item === "Mindful eating" || item === "Meal planning"} />
                      <span>{item}</span>
                    </Label>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label>How would you describe your current fitness level?</Label>
                <RadioGroup name="fitnessLevel" defaultValue="Intermediate" className="grid gap-3 sm:grid-cols-3">
                  {["Beginner", "Intermediate", "Advanced"].map((level) => (
                    <Label key={level} className="flex items-center gap-3 rounded-md border p-3">
                      <RadioGroupItem value={level} />
                      <span>{level}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label>Dietary preferences or restrictions</Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {dietaryPreferences.map((item) => (
                    <Label key={item} className="flex items-center gap-3 rounded-md border p-3">
                      <Checkbox name="dietaryPreferences" value={item} defaultChecked={item === "Gluten-free"} />
                      <span>{item}</span>
                    </Label>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Days per week</Label>
                  <Select name="availabilityDays" defaultValue="3-5 days">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-2 days">1-2 days</SelectItem>
                      <SelectItem value="3-5 days">3-5 days</SelectItem>
                      <SelectItem value="6-7 days">6-7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time of day</Label>
                  <Select name="availabilityTime" defaultValue="Morning">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">Morning</SelectItem>
                      <SelectItem value="Afternoon">Afternoon</SelectItem>
                      <SelectItem value="Evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Session length</Label>
                  <Select name="sessionLength" defaultValue="30-45 minutes">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20-30 minutes">20-30 minutes</SelectItem>
                      <SelectItem value="30-45 minutes">30-45 minutes</SelectItem>
                      <SelectItem value="45-60 minutes">45-60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <Label className="flex items-start gap-3 rounded-md border bg-muted/30 p-4">
                <Checkbox name="disclaimerAccepted" required />
                <span className="text-sm text-muted-foreground">
                  I acknowledge this program is for wellness and educational purposes only
                  and is not a substitute for medical advice. I will consult my physician
                  before starting new nutrition or exercise programming when needed.
                </span>
              </Label>
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Choose your program</CardTitle>
                <CardDescription>Select the best fit for this season.</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup name="programId" defaultValue={defaultProgram} className="space-y-3">
                  {programs.map((program) => (
                    <Label
                      key={program.id}
                      className="flex cursor-pointer gap-3 rounded-md border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                    >
                      <RadioGroupItem value={program.id} />
                      <span className="space-y-2">
                        <span className="block font-medium">{program.title}</span>
                        <span className="block text-sm text-muted-foreground">
                          {program.description}
                        </span>
                        <Badge variant="secondary">{program.bestFor}</Badge>
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
                {programs.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No programs have been published yet. Ask your coach to publish a program before onboarding.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <p className="font-medium">Not sure which program is right?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The coach can adjust your program anytime from the admin panel.
                </p>
              </CardContent>
            </Card>
            <Button type="submit" size="lg" className="w-full" disabled={programs.length === 0}>
              Continue
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
