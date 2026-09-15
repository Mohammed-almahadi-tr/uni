Imports System.Data.SqlClient
Imports EgyCurr.CurText

Public Class frmRegisteration

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Me.Close()
    End Sub
    Sub clear()
        Me.CombCollege.SelectedIndex = -1
        Me.ComboTerm.SelectedIndex = -1
        Me.txtStdName.Clear()
        Me.combSex.SelectedIndex = -1
        Me.comblevel.SelectedIndex = -1
        Me.CombNatio.SelectedIndex = -1
        Me.combRel.SelectedIndex = -1
        Me.txtstdAdd.Clear()
        Me.CombBlood.SelectedIndex = -1
        Me.txtstdMob.Clear()
        Me.txtFathName.Clear()
        Me.txtJob.Clear()
        Me.txtRel.Clear()
        Me.txtFathMob.Clear()
        Me.txtRelName.Clear()
        Me.txtRelTel.Clear()
        Me.txtUniNo.Clear()
        Me.CombYear.SelectedIndex = -1
        Me.CombCerType.SelectedIndex = -1
        Me.CombAccType.SelectedIndex = -1
        Me.CombTermTra.SelectedIndex = -1
        Me.CombTermTo.SelectedIndex = -1
        Me.CombStdRes.SelectedIndex = -1
        Me.CombOutTran.SelectedIndex = -1
        Me.CombUni.SelectedIndex = -1
        Me.CombCollege.SelectedIndex = -1
        Me.CombInTra.SelectedIndex = -1
        Me.CombSection.SelectedIndex = -1
        Me.ComboColTo.SelectedIndex = -1
        Me.ComboSection.SelectedIndex = -1
        Me.txtFeesYrsAgo.Clear()
        Me.txtFeesInWo.Clear()
        Me.txtFeesForNow.Clear()
        Me.txtFesInWo.Clear()
        Me.txtPaidFees.Clear()
        Me.txtPaidInWo.Clear()
        Me.txtRegFes.Clear()
        Me.txtRegInWo.Clear()
        Me.txtAccountName.Clear()
        Me.txtRegsName.Clear()
    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        Me.ErrorProvider1.Clear()
        If Me.CombCollege.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombCollege, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.ComboTerm.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.ComboTerm, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.txtStdName.Text = "" Then
            Me.ErrorProvider1.SetError(Me.txtStdName, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.combSex.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.combSex, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.comblevel.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.comblevel, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.CombNatio.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombNatio, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.combRel.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.combRel, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.txtstdAdd.Text = "" Then
            Me.ErrorProvider1.SetError(Me.txtstdAdd, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.CombBlood.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombBlood, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.txtstdMob.Text = "" Then
            Me.ErrorProvider1.SetError(Me.txtstdMob, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.txtFathName.Text = "" Then
            Me.ErrorProvider1.SetError(Me.txtFathName, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.txtJob.Text = "" Then
            Me.ErrorProvider1.SetError(Me.txtJob, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.txtRel.Text = "" Then
            Me.ErrorProvider1.SetError(Me.txtRel, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.txtFathMob.Text = "" Then
            Me.ErrorProvider1.SetError(Me.txtFathMob, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.txtRelName.Text = "" Then
            Me.ErrorProvider1.SetError(Me.txtRelName, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.txtRelTel.Text = "" Then
            Me.ErrorProvider1.SetError(Me.txtRelTel, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.txtUniNo.Text = "" Then
            Me.ErrorProvider1.SetError(Me.txtUniNo, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.CombYear.Text = "" Then
            Me.ErrorProvider1.SetError(Me.CombYear, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.CombCerType.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombCerType, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.CombAccType.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombAccType, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.CombTermTra.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombTermTra, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.CombTermTo.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombTermTo, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.CombStdRes.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombTermTo, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.CombOutTran.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombOutTran, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.CombUni.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombUni, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.CombColTo.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombColTo, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.CombInTra.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombInTra, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.CombSection.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.CombSection, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.ComboColTo.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.ComboColTo, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.ComboSection.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.ComboSection, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.txtFeesYrsAgo.Text = "" Then
            Me.ErrorProvider1.SetError(Me.txtFeesYrsAgo, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.txtFeesForNow.Text = "" Then
            Me.ErrorProvider1.SetError(Me.txtFeesForNow, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.txtPaidFees.Text = "" Then
            Me.ErrorProvider1.SetError(Me.txtPaidFees, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        If Me.txtRegFes.Text = "" Then
            Me.ErrorProvider1.SetError(Me.txtRegFes, "الرجاء إكمال البيانات")
            Exit Sub
        End If
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim UniNo As Integer
            Dim cmd As New SqlCommand("insert into Students (RegisDate,College,Term,FulName,Sex,stlevel,Nationality,Religious" & _
                                      ",stdAddress,BloodGroup,stdMobile,FathName,Job,Relative" & _
                                      ",RelMobile,RelName,RelTele,SNo,Year,CerType,AcceptType,TermTra,TermTo,StdRes,OutTran,UniName" & _
                                      ",CollTo,InTraCol,SectionFrom,ColTo,SectionTo,FeesYrsAgo" & _
                                      ",FeesInWo,FeesForNow,FesInWo,PaidFees,PaidInWo,RegFes,RegInWo,AccounName,RegsName)" & _
                                      " values(N'" & Me.dtRegisDate.Value.ToShortDateString & "',N'" & Me.CombCollege.Text & _
                                      "',N'" & Me.ComboTerm.Text & "',N'" & Me.txtStdName.Text & _
                                      "',N'" & Me.combSex.SelectedItem & "',N'" & Me.comblevel.SelectedItem & _
                                      "',N'" & Me.CombNatio.Text & "',N'" & Me.combRel.Text & "',N'" & Me.txtstdAdd.Text & _
                                      "',N'" & Me.CombBlood.SelectedItem & "',N'" & Me.txtstdMob.Text & "',N'" & Me.txtFathName.Text & _
                                      "',N'" & Me.txtJob.Text & "',N'" & Me.txtRel.Text & "',N'" & Me.txtFathMob.Text & _
                                      "',N'" & Me.txtRelName.Text & "',N'" & Me.txtRelTel.Text & "',N'" & Me.txtUniNo.Text & "',N'" & Me.CombYear.Text & _
                                      "',N'" & Me.CombCerType.SelectedItem & "',N'" & Me.CombAccType.SelectedItem & _
                                      "',N'" & Me.CombTermTra.SelectedItem & "',N'" & Me.CombTermTo.SelectedItem & _
                                      "',N'" & Me.CombStdRes.Text & "',N'" & Me.CombOutTran.SelectedItem & _
                                      "',N'" & Me.CombUni.Text & "',N'" & Me.CombCollege.SelectedItem & _
                                      "',N'" & Me.CombInTra.SelectedItem & "',N'" & Me.CombSection.SelectedItem & _
                                      "',N'" & Me.ComboColTo.SelectedItem & "',N'" & Me.ComboSection.SelectedItem & _
                                      "'," & Me.txtFeesYrsAgo.Text & ",N'" & Me.txtFeesInWo.Text & "'," & Me.txtFeesForNow.Text & _
                                      ",N'" & Me.txtFesInWo.Text & "'," & Me.txtPaidFees.Text & ",N'" & Me.txtPaidInWo.Text & _
                                      "',N'" & Me.txtRegFes.Text & "',N'" & Me.txtRegInWo.Text & "',N'" & Me.txtAccountName.Text & _
                                      "',N'" & Me.txtRegsName.Text & "')", cnn)
            cnn.Open()
            cmd.ExecuteNonQuery()
            cnn.Close()
            MsgBox("تم الحفظ")

            Me.clear()
            PrintRptRegisteration(Me.ComboTerm.SelectedItem)

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        PrintRptRegisteration(Me.ComboTerm.SelectedItem)
        Me.clear()
    End Sub

    Private Sub frmRegisteration_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Dim CollegeList As New ArrayList
            CollegeList = GetCollegesList()

            For Each CollegeName As String In CollegeList
                Me.CombCollege.Items.Add(CollegeName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub txtstdAdd_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtstdAdd.TextChanged

    End Sub

    Private Sub txtFathMob_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtFathMob.TextChanged

    End Sub

    Private Sub txtJob_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtJob.TextChanged

    End Sub

    Private Sub txtRelTel_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtRelTel.TextChanged

    End Sub

    Private Sub GroupBox7_Enter(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles GroupBox7.Enter

    End Sub

    Private Sub txtFeesYrsAgo_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtFeesYrsAgo.TextChanged
        Try
            Me.txtFeesInWo.Text = ChangeTo(Me.txtFeesYrsAgo.Text)
            Me.txtFeesInWo.Text = Me.txtFeesInWo.Text.Replace(")", "")
            Me.txtFeesInWo.Text = Me.txtFeesInWo.Text.Replace("(", "")
        Catch
            Me.txtFeesInWo.Clear()
        End Try
    End Sub

    Private Sub txtFeesForNow_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtFeesForNow.TextChanged
        Try
            Me.txtFesInWo.Text = ChangeTo(Me.txtFeesForNow.Text)
            Me.txtFesInWo.Text = Me.txtFesInWo.Text.Replace(")", "")
            Me.txtFesInWo.Text = Me.txtFesInWo.Text.Replace("(", "")
        Catch
            Me.txtFesInWo.Clear()
        End Try
    End Sub

    Private Sub txtPaidFees_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtPaidFees.TextChanged
        Try
            Me.txtPaidInWo.Text = ChangeTo(Me.txtPaidFees.Text)
            Me.txtPaidInWo.Text = Me.txtPaidInWo.Text.Replace(")", "")
            Me.txtPaidInWo.Text = Me.txtPaidInWo.Text.Replace("(", "")
        Catch
            Me.txtPaidInWo.Clear()
        End Try
    End Sub

    Private Sub txtRegFes_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtRegFes.TextChanged
        Try
            Me.txtRegInWo.Text = ChangeTo(Me.txtRegFes.Text)
            Me.txtRegInWo.Text = Me.txtRegInWo.Text.Replace(")", "")
            Me.txtRegInWo.Text = Me.txtRegInWo.Text.Replace("(", "")
        Catch
            Me.txtRegInWo.Clear()
        End Try
    End Sub
End Class
