Imports System.Data.SqlClient

Public Class frmPayBill

    Dim a, b, c, d, f, g, h, i, j, k As String
    Sub clean()
        c = ""
        d = ""
        f = ""
        g = ""
        h = ""
        i = ""
        j = ""
        k = ""
    End Sub
    Sub fun1()
        Try
            If a.Chars(0) = "0" Then
                b = ("صفر")
            ElseIf a.Chars(0) = "1" Then
                b = (" واحد")
            ElseIf a.Chars(0) = "2" Then
                b = "اثنان"
            ElseIf a.Chars(0) = "3" Then
                b = "ثلاثة"
            ElseIf a.Chars(0) = "4" Then
                b = "اربعة"
            ElseIf a.Chars(0) = "5" Then
                b = "خمسة"
            ElseIf a.Chars(0) = "6" Then
                b = "ستة"
            ElseIf a.Chars(0) = "7" Then
                b = "سبعة"
            ElseIf a.Chars(0) = "8" Then
                b = "ثمانية"
            ElseIf a.Chars(0) = "9" Then
                b = "تسع"
            End If
            clean()
        Catch
        End Try
    End Sub
    Sub fun2()
        Try
            If a.Chars(1) = "0" Then
                b = ("")
            ElseIf a.Chars(1) = "1" And a.Chars(0) = "1" Then
                b = (" احد")
            ElseIf a.Chars(1) = "1" Then
                b = (" واحد")
            ElseIf a.Chars(1) = "2" And a.Chars(0) = "1" Then
                b = "اثنا"

            ElseIf a.Chars(1) = "2" Then
                b = "اثنان"
            ElseIf a.Chars(1) = "3" Then
                b = "ثلاثة"
            ElseIf a.Chars(1) = "4" Then
                b = "اربعة"
            ElseIf a.Chars(1) = "5" Then
                b = "خمسة"
            ElseIf a.Chars(1) = "6" Then
                b = "ستة"
            ElseIf a.Chars(1) = "7" Then
                b = "سبعة"
            ElseIf a.Chars(1) = "8" Then
                b = "ثمانية"
            ElseIf a.Chars(1) = "9" Then
                b = "تسعة"
            End If
            If a.Chars(0) = "0" Then
                c = " "
            ElseIf a.Chars(0) = "1" And a.Chars(1) = "0" Then
                c = (" عشرة")
            ElseIf a.Chars(0) = "1" Then
                c = (" عشر")

            ElseIf a.Chars(0) = "2" And a.Chars(1) = "0" Then
                c = " عشرون"
            ElseIf a.Chars(0) = "2" Then
                c = "وعشرون"

            ElseIf a.Chars(0) = "3" And a.Chars(1) = "0" Then
                c = "ثلاثون"
            ElseIf a.Chars(0) = "3" Then
                c = "وثلاثون"

            ElseIf a.Chars(0) = "4" And a.Chars(1) = "0" Then
                c = "اربعون"
            ElseIf a.Chars(0) = "4" Then
                c = "واربعون"

            ElseIf a.Chars(0) = "5" And a.Chars(1) = "0" Then
                c = "خمسون"
            ElseIf a.Chars(0) = "5" Then
                c = "وخمسون"

            ElseIf a.Chars(0) = "6" And a.Chars(1) = "0" Then
                c = "ستون"
            ElseIf a.Chars(0) = "6" Then
                c = "وستون"

            ElseIf a.Chars(0) = "7" And a.Chars(1) = "0" Then
                c = "سبعون"
            ElseIf a.Chars(0) = "7" Then
                c = "وسبعون"

            ElseIf a.Chars(0) = "8" And a.Chars(1) = "0" Then
                c = "ثمانون"
            ElseIf a.Chars(0) = "8" Then
                c = "وثمانون"

            ElseIf a.Chars(0) = "9" And a.Chars(1) = "0" Then
                c = "تسعون"
            ElseIf a.Chars(0) = "9" Then
                c = "وتسعون"
            End If
            d = ""
            f = ""
            g = ""
            h = ""
            i = ""
            j = ""
            k = ""
        Catch
        End Try
    End Sub
    Sub fun3() '333333333333
        Try
            If a.Chars(2) = "0" Then
                b = ("")
            ElseIf a.Chars(2) = "1" And a.Chars(1) = "1" Then
                b = ("و احد")
            ElseIf a.Chars(2) = "1" Then
                b = ("و واحد")
            ElseIf a.Chars(2) = "2" And a.Chars(1) = "1" Then
                b = "واثنا"

            ElseIf a.Chars(2) = "2" Then
                b = "واثنان"
            ElseIf a.Chars(2) = "3" Then
                b = "وثلاثة"
            ElseIf a.Chars(2) = "4" Then
                b = "واربعة"
            ElseIf a.Chars(2) = "5" Then
                b = "وخمسة"
            ElseIf a.Chars(2) = "6" Then
                b = "وستة"
            ElseIf a.Chars(2) = "7" Then
                b = "وسبعة"
            ElseIf a.Chars(2) = "8" Then
                b = "وثمانية"
            ElseIf a.Chars(2) = "9" Then
                b = "وتسعة"
            End If
            If a.Chars(1) = "0" Then
                c = " "
            ElseIf a.Chars(1) = "1" And a.Chars(2) = "0" Then
                c = ("و عشرة")
            ElseIf a.Chars(1) = "1" Then
                c = (" عشر")
            ElseIf a.Chars(1) = "2" Then
                c = "وعشرون"
            ElseIf a.Chars(1) = "3" Then
                c = "وثلاثون"
            ElseIf a.Chars(1) = "4" Then
                c = "واربعون"
            ElseIf a.Chars(1) = "5" Then
                c = "وخمسون"
            ElseIf a.Chars(1) = "6" Then
                c = "وستون"
            ElseIf a.Chars(1) = "7" Then
                c = "وسبعون"
            ElseIf a.Chars(1) = "8" Then
                c = "وثمانون"
            ElseIf a.Chars(1) = "9" Then
                c = "وتسعون"
            End If
            f = ""
            g = ""
            h = ""
            i = ""
            j = ""
            k = ""
            If a.Chars(0) = "1" Then
                d = "مئة "
            ElseIf a.Chars(0) = "2" Then
                d = "مئتان"
            ElseIf a.Chars(0) = "3" Then
                d = "ثلاثمائة"

            ElseIf a.Chars(0) = "4" Then
                d = "اربعمائة"
            ElseIf a.Chars(0) = "5" Then
                d = "خمسمائة"
            ElseIf a.Chars(0) = "6" Then
                d = "ستمائة"

            ElseIf a.Chars(0) = "7" Then
                d = "سبعمائة"
            ElseIf a.Chars(0) = "8" Then
                d = "ثمانمائة"
            ElseIf a.Chars(0) = "9" Then
                d = "تسعمائة"
            ElseIf a.Chars(0) = "" Then
                d = " "
            End If
        Catch
        End Try
    End Sub
    Sub fun4() '44444444444444444444444444444444
        Try
            If a.Chars(3) = "0" Then
                b = ("")
            ElseIf a.Chars(3) = "1" And a.Chars(2) = "1" Then
                b = ("و احد")
            ElseIf a.Chars(3) = "1" Then
                b = ("و واحد")
            ElseIf a.Chars(3) = "2" And a.Chars(2) = "1" Then
                b = "واثنا"

            ElseIf a.Chars(3) = "2" Then
                b = "واثنان"
            ElseIf a.Chars(3) = "3" Then
                b = "وثلاثة"
            ElseIf a.Chars(3) = "4" Then
                b = "واربعة"
            ElseIf a.Chars(3) = "5" Then
                b = "وخمسة"
            ElseIf a.Chars(3) = "6" Then
                b = "وستة"
            ElseIf a.Chars(3) = "7" Then
                b = "وسبعة"
            ElseIf a.Chars(3) = "8" Then
                b = "وثمانية"
            ElseIf a.Chars(3) = "9" Then
                b = "وتسعة"
            End If
            If a.Chars(2) = "0" Then
                c = " "
            ElseIf a.Chars(2) = "1" And a.Chars(3) = "0" Then
                c = ("و عشرة")
            ElseIf a.Chars(2) = "1" Then
                c = (" عشر")
            ElseIf a.Chars(2) = "2" Then
                c = "وعشرون"
            ElseIf a.Chars(2) = "3" Then
                c = "وثلاثون"
            ElseIf a.Chars(2) = "4" Then
                c = "واربعون"
            ElseIf a.Chars(2) = "5" Then
                c = "وخمسون"
            ElseIf a.Chars(2) = "6" Then
                c = "وستون"
            ElseIf a.Chars(2) = "7" Then
                c = "وسبعون"
            ElseIf a.Chars(2) = "8" Then
                c = "وثمانون"
            ElseIf a.Chars(2) = "9" Then
                c = "وتسعون"
            End If
            g = ""
            h = ""
            i = ""
            j = ""
            k = ""
            If a.Chars(1) = "0" Then
                d = " "
            ElseIf a.Chars(1) = "1" Then
                d = "ومئة"
            ElseIf a.Chars(1) = "2" Then
                d = "ومئتان"
            ElseIf a.Chars(1) = "3" Then
                d = "وثلاثمائة"

            ElseIf a.Chars(1) = "4" Then
                d = "واربعمائة"
            ElseIf a.Chars(1) = "5" Then
                d = "وخمسمائة"
            ElseIf a.Chars(1) = "6" Then
                d = "وستمائة"

            ElseIf a.Chars(1) = "7" Then
                d = "وسبعمائة"
            ElseIf a.Chars(1) = "8" Then
                d = "وثمانمائة"
            ElseIf a.Chars(1) = "9" Then
                d = "وتسعمائة"
            ElseIf a.Chars(1) = "" Then
                d = " "
            End If
            If a.Chars(0) = "0" Then
                f = ""
            ElseIf a.Chars(0) = "1" Then
                f = "ألف"
            ElseIf a.Chars(0) = "2" Then
                f = "ألفان"
            ElseIf a.Chars(0) = "3" Then
                f = "ثلاثةالآف"

            ElseIf a.Chars(0) = "4" Then
                f = "اربعةالآف"
            ElseIf a.Chars(0) = "5" Then
                f = "خمسةالآف"
            ElseIf a.Chars(0) = "6" Then
                f = "ستةالآف"

            ElseIf a.Chars(0) = "7" Then
                f = "سبعةالآف "
            ElseIf a.Chars(0) = "8" Then
                f = "ثمانيةالآف "
            ElseIf a.Chars(0) = "9" Then
                f = "تسعةالآف "

            End If
        Catch
        End Try
    End Sub
    Sub fun5() '55555555555555555555'case 01111
        Try
            If a.Chars(4) = "0" Then
                b = ("")
            ElseIf a.Chars(4) = "1" And a.Chars(3) = "1" Then
                b = ("و احد ")
            ElseIf a.Chars(4) = "1" Then
                b = ("و واحد ")
            ElseIf a.Chars(4) = "2" And a.Chars(3) = "1" Then
                b = "واثنا"

            ElseIf a.Chars(4) = "2" Then
                b = "واثنان"
            ElseIf a.Chars(4) = "3" Then
                b = "وثلاثة"
            ElseIf a.Chars(4) = "4" Then
                b = "واربعة"
            ElseIf a.Chars(4) = "5" Then
                b = "وخمسة"
            ElseIf a.Chars(4) = "6" Then
                b = "وستة"
            ElseIf a.Chars(4) = "7" Then
                b = "وسبعة"
            ElseIf a.Chars(4) = "8" Then
                b = "وثمانية"
            ElseIf a.Chars(4) = "9" Then
                b = "وتسعة"
            End If
            If a.Chars(3) = "0" Then
                c = " "
            ElseIf a.Chars(3) = "1" And a.Chars(4) = "0" Then
                c = ("و عشرة")
            ElseIf a.Chars(3) = "1" Then
                c = (" عشر")
            ElseIf a.Chars(3) = "2" Then
                c = "وعشرون"
            ElseIf a.Chars(3) = "3" Then
                c = "وثلاثون"
            ElseIf a.Chars(3) = "4" Then
                c = "واربعون"
            ElseIf a.Chars(3) = "5" Then
                c = "وخمسون"
            ElseIf a.Chars(3) = "6" Then
                c = "وستون"
            ElseIf a.Chars(3) = "7" Then
                c = "وسبعون"
            ElseIf a.Chars(3) = "8" Then
                c = "وثمانون"
            ElseIf a.Chars(3) = "9" Then
                c = "وتسعون"
            End If
            ' h = ""
            'i = ""
            'j = ""
            'k = ""
            If a.Chars(2) = "0" Then
                d = " "
            ElseIf a.Chars(2) = "1" Then
                d = "ومئة"
            ElseIf a.Chars(2) = "2" Then
                d = "ومئتان"
            ElseIf a.Chars(2) = "3" Then
                d = "وثلاثمائة"

            ElseIf a.Chars(2) = "4" Then
                d = "واربعمائة"
            ElseIf a.Chars(2) = "5" Then
                d = "وخمسمائة"
            ElseIf a.Chars(2) = "6" Then
                d = "وستمائة"

            ElseIf a.Chars(2) = "7" Then
                d = "وسبعمائة"
            ElseIf a.Chars(2) = "8" Then
                d = "وثمانمائة"
            ElseIf a.Chars(2) = "9" Then
                d = "وتسعمائة"
            ElseIf a.Chars(2) = "0" Then
                d = " "
            End If
            If a.Chars(1) = "0" Then
                f = ""
            ElseIf a.Chars(1) = "1" And a.Chars(0) = "1" Then
                f = " احد"
            ElseIf a.Chars(1) = "1" Then
                f = "واحد"
            ElseIf a.Chars(1) = "2" And a.Chars(0) = "1" Then
                f = "اثنا"
            ElseIf a.Chars(1) = "2" Then
                f = "اثنان"
            ElseIf a.Chars(1) = "3" Then
                f = "ثلاثة"

            ElseIf a.Chars(1) = "4" Then
                f = "اربعة"
            ElseIf a.Chars(1) = "5" Then
                f = "خمسة"
            ElseIf a.Chars(1) = "6" Then
                f = "ستة"

            ElseIf a.Chars(1) = "7" Then
                f = "سبعة"
            ElseIf a.Chars(1) = "8" Then
                f = "ثمانية "
            ElseIf a.Chars(1) = "9" Then
                f = "تسعة "
            End If
            If a.Chars(0) = "1" And a.Chars(1) = "0" Then
                g = " عشرةالآف"
            ElseIf a.Chars(0) = "1" Then
                g = " عشرالف"
            ElseIf a.Chars(0) = "0" Then
                g = " "

            ElseIf a.Chars(0) = "2" And a.Chars(1) = "0" Then
                g = " عشرون الف"
            ElseIf a.Chars(0) = "2" Then
                g = "وعشرون الف "

            ElseIf a.Chars(0) = "3" And a.Chars(1) = "0" Then
                g = "ثلاثون الف"
            ElseIf a.Chars(0) = "3" Then
                g = "وثلاثون الف"

            ElseIf a.Chars(0) = "4" And a.Chars(1) = "0" Then
                g = " اربعون الف"
            ElseIf a.Chars(0) = "4" Then
                g = "واربعون الف"

            ElseIf a.Chars(0) = "5" And a.Chars(1) = "0" Then
                g = "خمسون الف"
            ElseIf a.Chars(0) = "5" Then
                g = "وخمسون الف"

            ElseIf a.Chars(0) = "6" And a.Chars(1) = "0" Then
                g = "ستون الف"
            ElseIf a.Chars(0) = "6" Then
                g = "وستون الف"

            ElseIf a.Chars(0) = "7" And a.Chars(1) = "0" Then
                g = "سبعون الف"
            ElseIf a.Chars(0) = "7" Then
                g = "وسبعون الف"

            ElseIf a.Chars(0) = "8" And a.Chars(1) = "0" Then
                g = "ثمانون الف"
            ElseIf a.Chars(0) = "8" Then
                g = "وثمانون الف"

            ElseIf a.Chars(0) = "9" And a.Chars(1) = "0" Then
                g = "تسعون الف"
            ElseIf a.Chars(0) = "9" Then
                g = "وتسعون الف"
            End If
            h = ""
            i = ""
            j = ""
            k = ""
        Catch
        End Try
    End Sub
    Sub fun6() '6666666666666666666666
        Try
            If a.Chars(5) = "0" Then
                b = ("")
            ElseIf a.Chars(5) = "1" And a.Chars(4) = "1" Then
                b = ("و احد")
            ElseIf a.Chars(5) = "1" Then
                b = ("و واحد ")
            ElseIf a.Chars(5) = "2" And a.Chars(4) = "1" Then
                b = "واثنا"

            ElseIf a.Chars(5) = "2" Then
                b = "واثنان"
            ElseIf a.Chars(5) = "3" Then
                b = "وثلاثة"
            ElseIf a.Chars(5) = "4" Then
                b = "واربعة"
            ElseIf a.Chars(5) = "5" Then
                b = "وخمسة"
            ElseIf a.Chars(5) = "6" Then
                b = "وستة"
            ElseIf a.Chars(5) = "7" Then
                b = "وسبعة"
            ElseIf a.Chars(5) = "8" Then
                b = "وثمانية"
            ElseIf a.Chars(5) = "9" Then
                b = "وتسعة"
            End If
            If a.Chars(4) = "0" Then
                c = " "
            ElseIf a.Chars(4) = "1" And a.Chars(5) = "0" Then
                c = ("و عشرة")
            ElseIf a.Chars(4) = "1" Then
                c = (" عشر")
            ElseIf a.Chars(4) = "2" Then
                c = "وعشرون"
            ElseIf a.Chars(4) = "3" Then
                c = "وثلاثون"
            ElseIf a.Chars(4) = "4" Then
                c = "واربعون"
            ElseIf a.Chars(4) = "5" Then
                c = "وخمسون"
            ElseIf a.Chars(4) = "6" Then
                c = "وستون"
            ElseIf a.Chars(4) = "7" Then
                c = "وسبعون"
            ElseIf a.Chars(4) = "8" Then
                c = "وثمانون"
            ElseIf a.Chars(4) = "9" Then
                c = "وتسعون"
            End If
            ' h = ""
            i = ""
            j = ""
            k = ""
            If a.Chars(3) = "0" Then
                d = " "
            ElseIf a.Chars(3) = "1" Then
                d = "ومئة"
            ElseIf a.Chars(3) = "2" Then
                d = "ومئتان"
            ElseIf a.Chars(3) = "3" Then
                d = "وثلاثمائة"

            ElseIf a.Chars(3) = "4" Then
                d = "واربعمائة"
            ElseIf a.Chars(3) = "5" Then
                d = "وخمسمائة"
            ElseIf a.Chars(3) = "6" Then
                d = "وستمائة"

            ElseIf a.Chars(3) = "7" Then
                d = "وسبعمائة"
            ElseIf a.Chars(3) = "8" Then
                d = "وثمانمائة"
            ElseIf a.Chars(3) = "9" Then
                d = "وتسعمائة"
            ElseIf a.Chars(3) = "0" Then
                d = " "
            End If
            If a.Chars(2) = "0" Then
                f = ""
            ElseIf a.Chars(2) = "1" And a.Chars(1) = "1" Then
                f = "واحد"
            ElseIf a.Chars(2) = "1" Then
                f = "وواحد"
            ElseIf a.Chars(2) = "2" And a.Chars(1) = "1" Then
                f = "واثنا"
            ElseIf a.Chars(2) = "2" Then
                f = "واثنان"
            ElseIf a.Chars(2) = "3" Then
                f = "وثلاثة"

            ElseIf a.Chars(2) = "4" Then
                f = "واربعة"
            ElseIf a.Chars(2) = "5" Then
                f = "وخمسة"
            ElseIf a.Chars(2) = "6" Then
                f = "وستة"

            ElseIf a.Chars(2) = "7" Then
                f = "وسبعة"
            ElseIf a.Chars(2) = "8" Then
                f = "وثمانية"
            ElseIf a.Chars(2) = "9" Then
                f = "وتسعة"
            End If
            If a.Chars(1) = "1" And a.Chars(2) = "0" Then
                g = "و عشرةالآف"
            ElseIf a.Chars(1) = "1" Then
                g = " عشرالف"
            ElseIf a.Chars(1) = "0" Then
                g = " "
            ElseIf a.Chars(1) = "2" Then
                g = "وعشرون الف "
            ElseIf a.Chars(1) = "3" Then
                g = "وثلاثون الف"
            ElseIf a.Chars(1) = "4" Then
                g = "واربعون الف"
            ElseIf a.Chars(1) = "5" Then
                g = "وخمسون الف"
            ElseIf a.Chars(1) = "6" Then
                g = "وستون الف"
            ElseIf a.Chars(1) = "7" Then
                g = "وسبعون الف"
            ElseIf a.Chars(1) = "8" Then
                g = "وثمانون الف"
            ElseIf a.Chars(1) = "9" Then
                g = "وتسعون الف"
            End If
            If a.Chars(0) = "0" Then
                h = " "
            ElseIf a.Chars(0) = "1" Then
                h = "مئة "
            ElseIf a.Chars(0) = "2" Then
                h = "مئتان"
            ElseIf a.Chars(0) = "3" Then
                h = "ثلاثمائة"

            ElseIf a.Chars(0) = "4" Then
                h = "اربعمائة"
            ElseIf a.Chars(0) = "5" Then
                h = "خمسمائة"
            ElseIf a.Chars(0) = "6" Then
                h = "ستمائة"

            ElseIf a.Chars(0) = "7" Then
                h = "سبعمائة"
            ElseIf a.Chars(0) = "8" Then
                h = "ثمانمائة"
            ElseIf a.Chars(0) = "9" Then
                h = "تسعمائة"
            End If
            i = ""
            j = ""
            k = ""
        Catch
        End Try
    End Sub
    Sub fun7() '7777777777777777777777777777777
        Try
            If a.Chars(6) = "0" Then
                b = ("")
            ElseIf a.Chars(6) = "1" And a.Chars(5) = "1" Then
                b = ("و احد")
            ElseIf a.Chars(6) = "1" Then
                b = ("وواحد")
            ElseIf a.Chars(6) = "2" And a.Chars(5) = "1" Then
                b = "واثنا"

            ElseIf a.Chars(6) = "2" Then
                b = "واثنان"
            ElseIf a.Chars(6) = "3" Then
                b = "و ثلاثة"
            ElseIf a.Chars(6) = "4" Then
                b = "واربعة"
            ElseIf a.Chars(6) = "5" Then
                b = "و خمسة"
            ElseIf a.Chars(6) = "6" Then
                b = "و ستة"
            ElseIf a.Chars(6) = "7" Then
                b = "و سبعة"
            ElseIf a.Chars(6) = "8" Then
                b = "وثمانية"
            ElseIf a.Chars(6) = "9" Then
                b = "وتسعة"
            End If
            If a.Chars(5) = "0" Then
                c = " "
            ElseIf a.Chars(5) = "1" And a.Chars(6) = "0" Then
                c = ("و عشرة")
            ElseIf a.Chars(5) = "1" Then
                c = "عشر"
            ElseIf a.Chars(5) = "2" Then
                c = "وعشرون"
            ElseIf a.Chars(5) = "3" Then
                c = "وثلاثون"
            ElseIf a.Chars(5) = "4" Then
                c = "واربعون"
            ElseIf a.Chars(5) = "5" Then
                c = "وخمسون"
            ElseIf a.Chars(5) = "6" Then
                c = "وستون"
            ElseIf a.Chars(5) = "7" Then
                c = "وسبعون"
            ElseIf a.Chars(5) = "8" Then
                c = "وثمانون"
            ElseIf a.Chars(5) = "9" Then
                c = "وتسعون"
            End If

            If a.Chars(4) = "0" Then
                d = " "
            ElseIf a.Chars(4) = "1" Then
                d = "و مئة "
            ElseIf a.Chars(4) = "2" Then
                d = "و مئتان"
            ElseIf a.Chars(4) = "3" Then
                d = "و ثلاثمائة"

            ElseIf a.Chars(4) = "4" Then
                d = "و اربعمائة"
            ElseIf a.Chars(4) = "5" Then
                d = "وخمسمائة"
            ElseIf a.Chars(4) = "6" Then
                d = "و ستمائة"

            ElseIf a.Chars(4) = "7" Then
                d = "و سبعمائة"
            ElseIf a.Chars(4) = "8" Then
                d = "و ثمانمائة"
            ElseIf a.Chars(4) = "9" Then
                d = "و تسعمائة"
            ElseIf a.Chars(4) = "0" Then
                d = " "
            End If
            If a.Chars(3) = "0" Then
                f = ""

            ElseIf a.Chars(3) = "1" And a.Chars(2) = "1" Then
                f = "واحد"
            ElseIf a.Chars(3) = "1" And a.Chars(2) = "0" And a.Chars(1) = "0" Then
                f = "و"
            ElseIf a.Chars(3) = "1" Then
                f = "وواحد"
            ElseIf a.Chars(3) = "2" And a.Chars(2) = "1" Then
                f = "و اثنا"
            ElseIf a.Chars(3) = "2" Then
                f = "و اثنان"
            ElseIf a.Chars(3) = "3" Then
                f = "و ثلاثة"

            ElseIf a.Chars(3) = "4" Then
                f = "و اربعة"
            ElseIf a.Chars(3) = "5" Then
                f = "و خمسة"
            ElseIf a.Chars(3) = "6" Then
                f = "وستة"

            ElseIf a.Chars(3) = "7" Then
                f = "وسبعة"
            ElseIf a.Chars(3) = "8" Then
                f = "و ثمانية"
            ElseIf a.Chars(3) = "9" Then
                f = "وتسعة"
            End If
            If a.Chars(2) = "1" And a.Chars(3) = "0" Then
                g = " و عشرةالآف"
            ElseIf a.Chars(2) = "1" Then
                g = " عشرالف"
            ElseIf a.Chars(2) = "0" Then
                g = " "
            ElseIf a.Chars(2) = "2" Then
                g = "وعشرون الف"

            ElseIf a.Chars(2) = "3" Then
                g = "وثلاثون الف"
            ElseIf a.Chars(2) = "4" Then
                g = "واربعون الف"
            ElseIf a.Chars(2) = "5" Then
                g = "وخمسون الف"
            ElseIf a.Chars(2) = "6" Then
                g = "وستون الف"
            ElseIf a.Chars(2) = "7" Then
                g = "وسبعون الف"
            ElseIf a.Chars(2) = "8" Then
                g = "وثمانون الف"
            ElseIf a.Chars(2) = "9" Then
                g = "وتسعون الف"
            End If
            If a.Chars(1) = "0" Then
                h = " "
            ElseIf a.Chars(1) = "1" Then
                h = "ومئة"
            ElseIf a.Chars(1) = "2" Then
                h = "و مئتان"
            ElseIf a.Chars(1) = "3" Then
                h = "و ثلاثمائة"
            ElseIf a.Chars(1) = "4" Then
                h = "و اربعمائة"
            ElseIf a.Chars(1) = "5" Then
                h = "و خمسمائة"
            ElseIf a.Chars(1) = "6" Then
                h = "و ستمائة"
            ElseIf a.Chars(1) = "7" Then
                h = "و سبعمائة"
            ElseIf a.Chars(1) = "8" Then
                h = "و ثمانمائة"
            ElseIf a.Chars(1) = "9" Then
                h = "و تسعمائة"
            ElseIf a.Chars(1) = "0" Then
                h = " "
            End If
            If a.Chars(0) = "0" Then
                i = ("")
            ElseIf a.Chars(0) = "1" Then
                i = ("واحدمليون")
            ElseIf a.Chars(0) = "2" Then
                i = "اثنين مليون"
            ElseIf a.Chars(0) = "3" Then
                i = "ثلاثةملايين"
            ElseIf a.Chars(0) = "4" Then
                i = "اربعةملايين"
            ElseIf a.Chars(0) = "5" Then
                i = "خمسةملايين"
            ElseIf a.Chars(0) = "6" Then
                i = "ستةملايين"
            ElseIf a.Chars(0) = "7" Then
                i = "سبعةملايين"
            ElseIf a.Chars(0) = "8" Then
                i = "ثمانيةملايين"
            ElseIf a.Chars(0) = "9" Then
                i = "تسعةملايين"
            End If
            j = ""
            k = ""
        Catch
        End Try
    End Sub
    Sub fun8() '888888888888888888888888888888888888
        Try
            If a.Chars(7) = "0" Then
                b = (" ")
            ElseIf a.Chars(7) = "1" And a.Chars(6) = "1" Then
                b = "واحد"
            ElseIf a.Chars(7) = "1" Then
                b = ("و واحد")
            ElseIf a.Chars(7) = "2" And a.Chars(6) = "1" Then
                b = "واثنا"

            ElseIf a.Chars(7) = "2" Then
                b = "واثنان"
            ElseIf a.Chars(7) = "3" Then
                b = "وثلاثة"
            ElseIf a.Chars(7) = "4" Then
                b = "واربعة"
            ElseIf a.Chars(7) = "5" Then
                b = "وخمسة"
            ElseIf a.Chars(7) = "6" Then
                b = "وستة"
            ElseIf a.Chars(7) = "7" Then
                b = "وسبعة"
            ElseIf a.Chars(7) = "8" Then
                b = "وثمانية"
            ElseIf a.Chars(7) = "9" Then
                b = "وتسعة"
            End If
            If a.Chars(6) = "0" Then
                c = " "
            ElseIf a.Chars(6) = "1" And a.Chars(7) = "0" Then
                c = ("و عشرة")
            ElseIf a.Chars(6) = "1" Then
                c = (" عشر")
            ElseIf a.Chars(6) = "2" Then
                c = "وعشرون"
            ElseIf a.Chars(6) = "3" Then
                c = "وثلاثون"
            ElseIf a.Chars(6) = "4" Then
                c = "واربعون"
            ElseIf a.Chars(6) = "5" Then
                c = "وخمسون"
            ElseIf a.Chars(6) = "6" Then
                c = "وستون"
            ElseIf a.Chars(6) = "7" Then
                c = "وسبعون"
            ElseIf a.Chars(6) = "8" Then
                c = "وثمانون"
            ElseIf a.Chars(6) = "9" Then
                c = "وتسعون"
            End If

            If a.Chars(5) = "0" Then
                d = " "
            ElseIf a.Chars(5) = "1" Then
                d = "ومئة"
            ElseIf a.Chars(5) = "2" Then
                d = "ومئتان"
            ElseIf a.Chars(5) = "3" Then
                d = "وثلاثمائة"

            ElseIf a.Chars(5) = "4" Then
                d = "واربعمائة"
            ElseIf a.Chars(5) = "5" Then
                d = "وخمسمائة"
            ElseIf a.Chars(5) = "6" Then
                d = "وستمائة"

            ElseIf a.Chars(5) = "7" Then
                d = "وسبعمائة"
            ElseIf a.Chars(5) = "8" Then
                d = "وثمانمائة"
            ElseIf a.Chars(5) = "9" Then
                d = "وتسعمائة"
            ElseIf a.Chars(5) = "0" Then
                d = " "
            End If
            If a.Chars(4) = "0" Then
                f = ""
            ElseIf a.Chars(4) = "1" And a.Chars(3) = "1" Then
                f = "واحد"
            ElseIf a.Chars(4) = "1" And a.Chars(3) = "0" And a.Chars(2) = "0" Then
                f = "و"
            ElseIf a.Chars(4) = "1" Then
                f = "وواحد"
            ElseIf a.Chars(4) = "2" And a.Chars(3) = "1" Then
                f = "واثنا"
            ElseIf a.Chars(4) = "2" Then
                f = "واثنان  "
            ElseIf a.Chars(4) = "3" Then
                f = "وثلاثة"

            ElseIf a.Chars(4) = "4" Then
                f = "واربعة"
            ElseIf a.Chars(4) = "5" Then
                f = "وخمسة"
            ElseIf a.Chars(4) = "6" Then
                f = "وستة"

            ElseIf a.Chars(4) = "7" Then
                f = "وسبعة"
            ElseIf a.Chars(4) = "8" Then
                f = "وثمانية"
            ElseIf a.Chars(4) = "9" Then
                f = "وتسعة"


            End If
            If a.Chars(3) = "1" And a.Chars(4) = "0" Then
                g = "وعشرةالف"
            ElseIf a.Chars(3) = "1" Then
                g = " عشرالف"
            ElseIf a.Chars(3) = "0" Then
                g = " "

            ElseIf a.Chars(3) = "2" Then
                g = "وعشرون الف "
            ElseIf a.Chars(3) = "3" Then
                g = "وثلاثون الف"
            ElseIf a.Chars(3) = "4" Then
                g = "واربعون الف"
            ElseIf a.Chars(3) = "5" Then
                g = "وخمسون الف"
            ElseIf a.Chars(3) = "6" Then
                g = "وستون الف"
            ElseIf a.Chars(3) = "7" Then
                g = "وسبعون الف"
            ElseIf a.Chars(3) = "8" Then
                g = "وثمانون الف"
            ElseIf a.Chars(3) = "9" Then
                g = "وتسعون الف"
            End If
            If a.Chars(2) = "0" Then
                h = " "
            ElseIf a.Chars(2) = "1" Then
                h = "ومئة"
            ElseIf a.Chars(2) = "2" Then
                h = "ومئتان"
            ElseIf a.Chars(2) = "3" Then
                h = "وثلاثمائة"

            ElseIf a.Chars(2) = "4" Then
                h = "واربعمائة"
            ElseIf a.Chars(2) = "5" Then
                h = "وخمسمائة"
            ElseIf a.Chars(2) = "6" Then
                h = "وستمائة"

            ElseIf a.Chars(2) = "7" Then
                h = "وسبعمائة"
            ElseIf a.Chars(2) = "8" Then
                h = "وثمانمائة"
            ElseIf a.Chars(2) = "9" Then
                h = "وتسعمائة"
            ElseIf a.Chars(2) = "0" Then
                h = " "
            End If '''''
            If a.Chars(1) = "0" Then
                i = ("")
            ElseIf a.Chars(1) = "1" And a.Chars(0) = "1" Then
                i = (" احد ")
            ElseIf a.Chars(1) = "1" Then
                i = (" واحد ")
            ElseIf a.Chars(1) = "2" And a.Chars(0) = "1" Then
                i = "اثنا"

            ElseIf a.Chars(1) = "2" Then
                i = "اثنان"
            ElseIf a.Chars(1) = "3" Then
                i = "ثلاثة"
            ElseIf a.Chars(1) = "4" Then
                i = "اربعة"
            ElseIf a.Chars(1) = "5" Then
                i = "خمسة"
            ElseIf a.Chars(1) = "6" Then
                i = "ستة"
            ElseIf a.Chars(1) = "7" Then
                i = "سبعة"
            ElseIf a.Chars(1) = "8" Then
                i = "ثمانية"
            ElseIf a.Chars(1) = "9" Then
                i = "تسعة"
            End If
            If a.Chars(0) = "0" Then
                j = " "
            ElseIf a.Chars(0) = "1" And a.Chars(1) = "0" Then
                j = (" عشرةملايين")
            ElseIf a.Chars(0) = "1" Then
                j = (" عشرمليون ")

            ElseIf a.Chars(0) = "2" And a.Chars(1) = "0" Then
                j = " عشرون مليون"
            ElseIf a.Chars(0) = "2" Then
                j = "وعشرون مليون"

            ElseIf a.Chars(0) = "3" And a.Chars(1) = "0" Then
                j = "ثلاثون مليون"
            ElseIf a.Chars(0) = "3" Then
                j = " وثلاثون مليون"

            ElseIf a.Chars(0) = "4" And a.Chars(1) = "0" Then
                j = "اربعون مليون"
            ElseIf a.Chars(0) = "4" Then
                j = "واربعون مليون"

            ElseIf a.Chars(0) = "5" And a.Chars(1) = "0" Then
                j = "خمسون مليون"
            ElseIf a.Chars(0) = "5" Then
                j = "وخمسون مليون"

            ElseIf a.Chars(0) = "6" And a.Chars(1) = "0" Then
                j = "ستون مليون"
            ElseIf a.Chars(0) = "6" Then
                j = "وستون مليون"

            ElseIf a.Chars(0) = "7" And a.Chars(1) = "0" Then
                j = "سبعون مليون"
            ElseIf a.Chars(0) = "7" Then
                j = "وسبعون مليون"

            ElseIf a.Chars(0) = "8" And a.Chars(1) = "0" Then
                j = "ثمانون مليون"
            ElseIf a.Chars(0) = "8" Then
                j = "وثمانون مليون"

            ElseIf a.Chars(0) = "9" And a.Chars(1) = "0" Then
                j = " تسعون مليون"
            ElseIf a.Chars(0) = "9" Then
                j = "وتسعون مليون"
            End If
            k = ""
        Catch
        End Try

    End Sub
    Sub fun9()
        '888888888888888888888888888888888888
        Try
            If a.Chars(8) = "0" Then
                b = (" ")
            ElseIf a.Chars(8) = "1" And a.Chars(7) = "1" Then
                b = "واحد"
            ElseIf a.Chars(8) = "1" Then
                b = ("و واحد")
            ElseIf a.Chars(8) = "2" And a.Chars(7) = "1" Then
                b = "واثنا"

            ElseIf a.Chars(8) = "2" Then
                b = "واثنان"
            ElseIf a.Chars(8) = "3" Then
                b = "وثلاثة"
            ElseIf a.Chars(8) = "4" Then
                b = "واربعة"
            ElseIf a.Chars(8) = "5" Then
                b = "وخمسة"
            ElseIf a.Chars(8) = "6" Then
                b = "وستة"
            ElseIf a.Chars(8) = "7" Then
                b = "وسبعة"
            ElseIf a.Chars(8) = "8" Then
                b = "وثمانية"
            ElseIf a.Chars(8) = "9" Then
                b = "وتسعة"
            End If
            If a.Chars(7) = "0" Then
                c = " "
            ElseIf a.Chars(7) = "1" And a.Chars(8) = "0" Then
                c = ("و عشرة")
            ElseIf a.Chars(7) = "1" Then
                c = (" عشر")
            ElseIf a.Chars(7) = "2" Then
                c = "وعشرون"
            ElseIf a.Chars(7) = "3" Then
                c = "وثلاثون"
            ElseIf a.Chars(7) = "4" Then
                c = "واربعون"
            ElseIf a.Chars(7) = "5" Then
                c = "وخمسون"
            ElseIf a.Chars(7) = "6" Then
                c = "وستون"
            ElseIf a.Chars(7) = "7" Then
                c = "وسبعون"
            ElseIf a.Chars(7) = "8" Then
                c = "وثمانون"
            ElseIf a.Chars(7) = "9" Then
                c = "وتسعون"
            End If

            If a.Chars(6) = "0" Then
                d = " "
            ElseIf a.Chars(6) = "1" Then
                d = "ومئة"
            ElseIf a.Chars(6) = "2" Then
                d = "ومئتان"
            ElseIf a.Chars(6) = "3" Then
                d = "وثلاثمائة"

            ElseIf a.Chars(6) = "4" Then
                d = "واربعمائة"
            ElseIf a.Chars(6) = "5" Then
                d = "وخمسمائة"
            ElseIf a.Chars(6) = "6" Then
                d = "وستمائة"

            ElseIf a.Chars(6) = "7" Then
                d = "وسبعمائة"
            ElseIf a.Chars(6) = "8" Then
                d = "وثمانمائة"
            ElseIf a.Chars(6) = "9" Then
                d = "وتسعمائة"
            ElseIf a.Chars(6) = "0" Then
                d = " "
            End If
            If a.Chars(5) = "0" Then
                f = ""
            ElseIf a.Chars(5) = "1" And a.Chars(4) = "1" Then
                f = "واحد"
            ElseIf a.Chars(5) = "1" And a.Chars(4) = "0" And a.Chars(3) = "0" Then
                f = "و"
            ElseIf a.Chars(5) = "1" Then
                f = "وواحد"
            ElseIf a.Chars(5) = "2" And a.Chars(4) = "1" Then
                f = "واثنا"
            ElseIf a.Chars(5) = "2" Then
                f = "واثنان  "
            ElseIf a.Chars(5) = "3" Then
                f = "وثلاثة"

            ElseIf a.Chars(5) = "4" Then
                f = "واربعة"
            ElseIf a.Chars(5) = "5" Then
                f = "وخمسة"
            ElseIf a.Chars(5) = "6" Then
                f = "وستة"

            ElseIf a.Chars(5) = "7" Then
                f = "وسبعة"
            ElseIf a.Chars(5) = "8" Then
                f = "وثمانية"
            ElseIf a.Chars(5) = "9" Then
                f = "وتسعة"
            ElseIf a.Chars(5) = "1" And a.Chars(4) = "0" And a.Chars(3) = "0" And a.Chars(6) <> "0" Or a.Chars(7) <> "0" Or a.Chars(8) <> "0" Then
                f = "و"
            End If
            If a.Chars(4) = "1" And a.Chars(5) = "0" Then
                g = "وعشرةالآف"
            ElseIf a.Chars(4) = "1" Then
                g = " عشرالف"
            ElseIf a.Chars(4) = "0" Then
                g = " "

            ElseIf a.Chars(4) = "2" Then
                g = "وعشرون الف "
            ElseIf a.Chars(4) = "3" Then
                g = "وثلاثون الف"
            ElseIf a.Chars(4) = "4" Then
                g = "واربعون الف"
            ElseIf a.Chars(4) = "5" Then
                g = "وخمسون الف"
            ElseIf a.Chars(4) = "6" Then
                g = "وستون الف"
            ElseIf a.Chars(4) = "7" Then
                g = "وسبعون الف"
            ElseIf a.Chars(4) = "8" Then
                g = "وثمانون الف"
            ElseIf a.Chars(4) = "9" Then
                g = "وتسعون الف"
            End If
            If a.Chars(3) = "0" Then
                h = " "
            ElseIf a.Chars(3) = "1" Then
                h = "ومئة"
            ElseIf a.Chars(3) = "2" Then
                h = "ومئتان"
            ElseIf a.Chars(3) = "3" Then
                h = "وثلاثمائة"

            ElseIf a.Chars(3) = "4" Then
                h = "واربعمائة"
            ElseIf a.Chars(3) = "5" Then
                h = "وخمسمائة"
            ElseIf a.Chars(3) = "6" Then
                h = "وستمائة"

            ElseIf a.Chars(3) = "7" Then
                h = "وسبعمائة"
            ElseIf a.Chars(3) = "8" Then
                h = "وثمانمائة"
            ElseIf a.Chars(3) = "9" Then
                h = "وتسعمائة"
            ElseIf a.Chars(3) = "0" Then
                h = " "
            End If '''''
            If a.Chars(2) = "0" Then
                i = ("")
            ElseIf a.Chars(2) = "1" And a.Chars(1) = "1" Then
                i = ("و احد ")
            ElseIf a.Chars(2) = "1" Then
                i = ("و واحد")
            ElseIf a.Chars(2) = "2" And a.Chars(1) = "1" Then
                i = "واثنا"

            ElseIf a.Chars(2) = "2" Then
                i = "واثنان"
            ElseIf a.Chars(2) = "3" Then
                i = "وثلاثة"
            ElseIf a.Chars(2) = "4" Then
                i = "واربعة"
            ElseIf a.Chars(2) = "5" Then
                i = "وخمسة"
            ElseIf a.Chars(2) = "6" Then
                i = "وستة"
            ElseIf a.Chars(2) = "7" Then
                i = "وسبعة"
            ElseIf a.Chars(2) = "8" Then
                i = "وثمانية"
            ElseIf a.Chars(2) = "9" Then
                i = "وتسعة"
            End If
            If a.Chars(1) = "0" Then
                j = " "
            ElseIf a.Chars(1) = "1" And a.Chars(2) = "0" Then
                j = (" عشرة")
            ElseIf a.Chars(1) = "1" Then
                j = (" عشر ")
            ElseIf a.Chars(1) = "2" Then
                j = "وعشرون "
            ElseIf a.Chars(1) = "3" Then
                j = " وثلاثون "
            ElseIf a.Chars(1) = "4" Then
                j = "واربعون "
            ElseIf a.Chars(1) = "5" Then
                j = "وخمسون "
            ElseIf a.Chars(1) = "6" Then
                j = "وستون "
            ElseIf a.Chars(1) = "7" Then
                j = "وسبعون "

            ElseIf a.Chars(1) = "8" Then
                j = "وثمانون "
            ElseIf a.Chars(1) = "9" Then
                j = "وتسعون "
            End If
            If a.Chars(0) = "1" Then
                k = "مئة"
            ElseIf a.Chars(0) = "2" Then
                k = "مئتان "
            ElseIf a.Chars(0) = "3" Then
                k = "ثلاثمائة"

            ElseIf a.Chars(0) = "4" Then
                k = "اربعمائة"
            ElseIf a.Chars(0) = "5" Then
                k = "خمسمائة"
            ElseIf a.Chars(0) = "6" Then
                k = "ستمائة"

            ElseIf a.Chars(0) = "7" Then
                k = "سبعمائة"
            ElseIf a.Chars(0) = "8" Then
                k = "ثمانمائة"
            ElseIf a.Chars(0) = "9" Then
                k = " تسعمائة"
            ElseIf a.Chars(0) = "" Then
                k = " "
            End If
        Catch
        End Try
    End Sub

    Sub Clear()
        Me.CombPack.SelectedIndex = -1
        Me.txtDescr.Clear()
        Me.txtAmount.Clear()
        Me.txtSource.Clear()
        Me.txtWrittenValue.Clear()
        Me.RCash.Checked = True
    End Sub

    Private Sub frmPayBill_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Clear()

        Try
            Dim cmd As New SqlCommand("SELECT distinct Pack FROM Acc where pack is not null", cnn)
            Dim SqlReader As SqlDataReader

            'OPEN THE CONNECTION
            'FILL THE DATASET & THE COMBOBOX
            cnn.Open()
            Me.CombPack.Items.Clear()
            SqlReader = cmd.ExecuteReader
            While SqlReader.Read
                Me.CombPack.Items.Add(SqlReader.Item(0))
            End While
            cnn.Close()
        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try

        Try
            Dim cmd As New SqlCommand("Select Distinct SubAcc From Acc Where Pack=N'الأصول المتداولة' " & _
                                      "and Acc=N'حسابات البنوك' and SubAcc Is Not Null", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.CombBank.Items.Add(Reader.Item(0))
            End While
            cnn.Close()
        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub CombPack_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombPack.SelectedIndexChanged
        Try
            If Me.CombPack.SelectedIndex = -1 Then
                Me.CombAcc2.Items.Clear()
                Me.CombAcc3.Items.Clear()
                Exit Sub
            End If

            Dim cmd As New SqlCommand("Select Distinct Acc From Acc Where Pack=N'" & Me.CombPack.SelectedItem & _
                                      "' and Acc Is Not Null", cnn)
            Dim Reader As SqlDataReader

            Me.CombAcc2.Items.Clear()
            Me.CombAcc3.Items.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.CombAcc2.Items.Add(Reader.Item(0))
            End While
            cnn.Close()
        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub CombAcc2_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombAcc2.SelectedIndexChanged
        Try
            If Me.CombAcc2.SelectedIndex = -1 Then
                Me.CombAcc3.Items.Clear()
                Exit Sub
            End If

            Dim cmd As New SqlCommand("Select Distinct SubAcc From Acc Where Pack=N'" & Me.CombPack.SelectedItem & _
                                      "' and Acc=N'" & Me.CombAcc2.SelectedItem & "' and SubAcc Is Not Null", cnn)
            Dim Reader As SqlDataReader

            Me.CombAcc3.Items.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.CombAcc3.Items.Add(Reader.Item(0))
            End While
            cnn.Close()
        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub txtAmount_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtAmount.TextChanged
        Try
            a = Int(Me.txtAmount.Text)
            If IsNumeric(txtAmount.Text) Then
                If a.Length = 1 Then
                    fun1()
                ElseIf a.Length = 2 Then
                    fun2()
                ElseIf a.Length = 3 Then
                    fun3()
                ElseIf a.Length = 4 Then
                    fun4()
                ElseIf a.Length = 5 Then
                    fun5()
                ElseIf a.Length = 6 Then
                    fun6()
                ElseIf a.Length = 7 Then
                    fun7()
                ElseIf a.Length = 8 Then
                    fun8()
                ElseIf a.Length = 9 Then
                    fun9()
                End If
            End If
            If h <> " " And g = " " And k = "" Then
                Me.txtWrittenValue.Text = i & " " & j & " " & h & " " & f & " " & g & "الف" & " " & d & " " & b & " " & c
            ElseIf Int(Me.txtAmount.Text) = 1000000000 Then
                Me.txtWrittenValue.Text = "واحد مليار"
                clean()
            ElseIf Int(Me.txtAmount.Text) > 1000000000 Then
                Me.txtWrittenValue.Clear()
            ElseIf k <> "" And h = " " And g = " " And f <> "" Then
                Me.txtWrittenValue.Text = k & "" & i & " " & j & " مليون" & " " & h & " " & f & " " & g & "الف" & " " & d & " " & b & " " & c
            ElseIf k <> "" And h <> " " And g <> " " And f <> "" Then
                Me.txtWrittenValue.Text = k & "" & i & " " & j & " مليون" & " " & h & " " & f & " " & g & " " & d & " " & b & " " & c

            ElseIf k <> "" And h = " " And g = " " And f = "" Then
                Me.txtWrittenValue.Text = k & "" & i & " " & j & " مليون" & " " & h & " " & f & " " & g & " " & d & " " & b & " " & c 'sa7
            ElseIf k <> "" And h <> " " And g = " " Then
                Me.txtWrittenValue.Text = k & "" & i & " " & j & " مليون" & " " & h & " " & f & " " & g & "الف" & " " & d & " " & b & " " & c 'sa7
            ElseIf k <> "" Then
                Me.txtWrittenValue.Text = k & " " & i & " " & j & " مليون" & " " & h & " " & f & " " & g & " " & d & " " & b & " " & c 'sa7
            ElseIf k = "" And h = " " And g = " " And f <> "" Then
                Me.txtWrittenValue.Text = i & " " & j & " " & h & " " & f & " " & g & "الف " & d & " " & b & " " & c 'sa7
            Else
                Me.txtWrittenValue.Text = k & "" & i & " " & j & " " & h & " " & f & " " & g & " " & d & " " & b & " " & c

            End If

        Catch
        End Try
    End Sub

    Private Sub RCash_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RCash.CheckedChanged
        If RCash.Checked = True Then
            Me.txtChNo.Text = "نقداً"
            Me.txtChNo.Enabled = False
            Me.CombBank.SelectedIndex = -1
            Me.CombBank.Enabled = False
        Else
            Me.txtChNo.Clear()
            Me.txtChNo.Enabled = True
            Me.CombBank.Enabled = True
            Me.txtChNo.Focus()
        End If
    End Sub

    Private Sub RBank_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RBank.CheckedChanged
        If RCash.Checked = True Then
            Me.txtChNo.Clear()
            Me.txtChNo.Enabled = False
            Me.CombBank.SelectedIndex = -1
            Me.CombBank.Enabled = False
        Else
            Me.txtChNo.Clear()
            Me.txtChNo.Enabled = True
            Me.CombBank.Enabled = True
            Me.txtChNo.Focus()
        End If
    End Sub

    Private Sub btnGSave_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnGSave.Click
        If Me.CombAcc2.SelectedIndex = -1 OrElse Me.txtSource.Text.Trim.Length = 0 OrElse Me.txtDescr.Text.Trim.Length = 0 OrElse Me.txtAmount.Text.Trim.Length = 0 Then
            MsgBox("الرجاء مراجعة البيانات")
            Exit Sub
        Else
            If Me.RBank.Checked = True Then
                If Me.txtChNo.Text.Trim.Length = 0 OrElse Me.CombBank.SelectedIndex = -1 Then
                    MsgBox("الرجاء إكمال بيانات الشيك")
                    Exit Sub
                End If
            End If

            Try
                Me.Cursor = Cursors.WaitCursor
                'Dim MoveNo As Integer = GetMoveNo()
                Dim MoveNo As Integer = 0
                Dim SNo As Integer = GetDocSNo("سند دفع")

                Dim cmd As New SqlCommand("Insert Into Transactions (MoveNo,TransType,SNo,Source,Descr," & _
                                          "Package,Acc,SubAcc,ChNo,Writting,TotalValueOut) " & _
                                          "Values (" & MoveNo & ",N'سند دفع'," & SNo & ",N'" & Me.txtSource.Text.Trim & "',N'" & _
                                          Me.txtDescr.Text.Trim & "',N'" & Me.CombPack.SelectedItem & "',N'" & _
                                          Me.CombAcc2.SelectedItem & "',N'" & Me.CombAcc3.SelectedItem & "',N'" & _
                                          Me.txtChNo.Text.Trim & "',N'" & Me.txtWrittenValue.Text.Trim & "'," & Me.txtAmount.Text.Trim & ")", cnn)

                Dim cmd1 As New SqlCommand("Insert Into Transactions (MoveNo,Descr," & _
                                         "Package,Acc,ChNo,Writting,TotalValueIn) " & _
                                         "Values (" & MoveNo & ",N'" & Me.txtDescr.Text.Trim & "',N'الأصول المتداولة',N'الخزينة'" & _
                                         ",N'" & Me.txtChNo.Text.Trim & "',N'" & Me.txtWrittenValue.Text.Trim & _
                                         "'," & Me.txtAmount.Text.Trim & ")", cnn)

                Dim cmd2 As New SqlCommand("Insert Into Transactions (MoveNo,Descr," & _
                                          "Package,Acc,SubAcc,ChNo,Writting,TotalValueIn) " & _
                                          "Values (" & MoveNo & ",N'" & Me.txtDescr.Text.Trim & "',N'الأصول المتداولة',N'حسابات البنوك'," & _
                                          "N'" & Me.CombBank.SelectedItem & "',N'" & Me.txtChNo.Text.Trim & _
                                          "',N'" & Me.txtWrittenValue.Text.Trim & "'," & Me.txtAmount.Text.Trim & ")", cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                If RCash.Checked = True Then
                    cmd1.ExecuteNonQuery()
                Else
                    cmd2.ExecuteNonQuery()
                End If
                cnn.Close()

                MsgBox("تم الحفظ")

                PrintBill("سند دفع", SNo)
                Clear()
                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Clear()
    End Sub

    Private Sub btnGClose_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnGClose.Click
        Me.Close()
    End Sub
End Class