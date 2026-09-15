Imports System.Data.SqlClient

Public Class FrmDataEntery
    Sub clear()
        Me.TxtFAR.Clear()
        Me.TxtSAr.Clear()
        Me.TxtTHAr.Clear()
        Me.TxtForAr.Clear()
        Me.CombColeg.SelectedIndex = -1
        Me.CombProgram.SelectedIndex = -1
        Me.CmbAdmiTyp.SelectedIndex = -1
        Me.CmbType.SelectedIndex = -1
        Me.txtUniversityID.Clear()
        Me.TxtYears.Clear()
        Me.TxtSchool.Clear()
    End Sub
    Private Sub BtnSave_Click(sender As System.Object, e As System.EventArgs) Handles BtnSave.Click
        Me.ErrProvider.Clear()
        If Me.TxtFAR.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.TxtFAR, "الرجاء ادخال الاسم الاول الطالب")
            Exit Sub
        ElseIf Me.TxtSAr.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.TxtSAr, "الرجاء ادخال الاسم الثاني للطالب ")
            Exit Sub
        ElseIf Me.TxtTHAr.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.TxtTHAr, "الرجاء ادخال الاسم الثالث للطالب ")
            Exit Sub
        ElseIf Me.TxtForAr.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.TxtForAr, "الرجاء ادخال الاسم الرابع للطالب ")
            Exit Sub
        ElseIf Me.TxtYears.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.TxtYears, "الرجاء ادخال السنة ")
            Exit Sub
        ElseIf Me.TxtSchool.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.TxtSchool, "الرجاء ادخال المدرسة   ")
            Exit Sub
        ElseIf Me.CmbType.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CmbType, "الرجاء اختيار النوع ")
            Exit Sub

        ElseIf Me.CmbAdmiTyp.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CmbAdmiTyp, "الرجاء اختيار نوع القبول ")
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand
                Dim Trans As SqlTransaction

                cnn.Open()
                cmd.Connection = cnn
                Trans = cnn.BeginTransaction
                cmd.Transaction = Trans

                cmd.CommandText = "Insert Into StdData (StdId,StdFirName,StdSecName,StdTheName,StdForName,StdColg,StdProgram,TypeAd,Type,Year,StdSchool,Employee) Values " & _
                              "(@StdId,@StdFirName,@StdSecName,@StdTheName,@StdForName,@StdColg,@StdProgram,@TypeAd,@Type,@Year,@StdSchool,@Employee)"


                cmd.Parameters.Clear()
                cmd.Parameters.AddWithValue("@StdId", Me.txtUniversityID.Text)
                'cmd.Parameters.AddWithValue("@TypeAd", Me.CmbAdmiTyp.Text)
                'cmd.Parameters.AddWithValue("@Type", Me.CmbType.Text)
                cmd.Parameters.AddWithValue("@StdFirName", Me.TxtFAR.Text)
                cmd.Parameters.AddWithValue("@StdTheName", Me.TxtTHAr.Text)
                cmd.Parameters.AddWithValue("@StdSecName", Me.TxtSAr.Text)
                cmd.Parameters.AddWithValue("@StdForName", Me.TxtForAr.Text)
                cmd.Parameters.AddWithValue("@StdColg", Me.CombColeg.Text)
                cmd.Parameters.AddWithValue("@StdProgram", Me.CombProgram.Text)
                cmd.Parameters.AddWithValue("@Year", Me.TxtYears.Text)
                cmd.Parameters.AddWithValue("@StdSchool", Me.TxtSchool.Text)
                cmd.Parameters.AddWithValue("@Employee", CurrentUser)
                If Me.CmbAdmiTyp.Text = "قبول عام" Then
                    cmd.Parameters.AddWithValue("@TypeAd", CInt(0))
                End If

                If Me.CmbAdmiTyp.Text = "قبول خاص" Then
                    cmd.Parameters.AddWithValue("@TypeAd", CInt(1))
                End If

                If Me.CmbAdmiTyp.Text = "ابناء عاملين" Then
                    cmd.Parameters.AddWithValue("@TypeAd", CInt(2))
                End If

                If Me.CmbAdmiTyp.Text = "وافدين" Then
                    cmd.Parameters.AddWithValue("@TypeAd", CInt(3))
                End If
                If Me.CmbType.Text = "دبلوم" Then
                    cmd.Parameters.AddWithValue("@Type", CInt(0))
                Else
                    cmd.Parameters.AddWithValue("@Type", CInt(1))
                End If
                cmd.ExecuteNonQuery()


                Trans.Commit()
                cnn.Close()

                MsgBox("Saved Successfully!")
                clear()
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

    Private Sub FrmDataEntery_Load(sender As System.Object, e As System.EventArgs) Handles MyBase.Load
        Me.txtUniversityID.Focus()
    End Sub

    Private Sub BtnClear_Click(sender As System.Object, e As System.EventArgs) Handles BtnClear.Click
        clear()
    End Sub

    Private Sub BtnClose_Click(sender As System.Object, e As System.EventArgs) Handles BtnClose.Click
        Me.Close()
    End Sub

    Private Sub CombColeg_SelectedIndexChanged(sender As System.Object, e As System.EventArgs) Handles CombColeg.SelectedIndexChanged

    End Sub
End Class